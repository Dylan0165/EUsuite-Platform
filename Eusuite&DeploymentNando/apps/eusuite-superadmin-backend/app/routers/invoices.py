from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from datetime import datetime
import uuid
from ..database import get_db
from ..models import Invoice, InvoiceStatus, Tenant, AdminUser, AuditLog
from ..schemas import InvoiceCreate, InvoiceUpdate, InvoiceResponse, PaginatedResponse
from ..auth import get_current_admin, require_admin

router = APIRouter(prefix="/invoices", tags=["Invoices"])


def generate_invoice_number() -> str:
    """Generate a unique invoice number"""
    timestamp = datetime.utcnow().strftime("%Y%m")
    unique = uuid.uuid4().hex[:6].upper()
    return f"INV-{timestamp}-{unique}"


@router.get("", response_model=PaginatedResponse)
async def list_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tenant_id: Optional[int] = None,
    status_filter: Optional[InvoiceStatus] = Query(None, alias="status"),
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all invoices with pagination"""
    query = select(Invoice)
    count_query = select(func.count(Invoice.id))
    
    if tenant_id:
        query = query.where(Invoice.tenant_id == tenant_id)
        count_query = count_query.where(Invoice.tenant_id == tenant_id)
    
    if status_filter:
        query = query.where(Invoice.status == status_filter)
        count_query = count_query.where(Invoice.status == status_filter)
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Get paginated results
    offset = (page - 1) * page_size
    query = query.order_by(Invoice.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    invoices = result.scalars().all()
    
    return PaginatedResponse(
        items=[InvoiceResponse.model_validate(i) for i in invoices],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    request: Request,
    invoice_data: InvoiceCreate,
    current_admin: AdminUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new invoice"""
    # Verify tenant exists
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == invoice_data.tenant_id)
    )
    tenant = tenant_result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )
    
    invoice = Invoice(
        tenant_id=invoice_data.tenant_id,
        invoice_number=generate_invoice_number(),
        status=InvoiceStatus.DRAFT,
        subtotal=invoice_data.subtotal,
        tax_rate=invoice_data.tax_rate,
        tax_amount=invoice_data.tax_amount,
        total=invoice_data.total,
        currency=invoice_data.currency,
        line_items=[item.model_dump() for item in invoice_data.line_items],
        due_date=invoice_data.due_date,
        notes=invoice_data.notes,
    )
    
    db.add(invoice)
    await db.commit()
    await db.refresh(invoice)
    
    # Log action
    audit_log = AuditLog(
        admin_user_id=current_admin.id,
        action="invoice.create",
        resource_type="invoice",
        resource_id=str(invoice.id),
        details={"invoice_number": invoice.invoice_number, "tenant_id": tenant.id, "total": invoice.total},
        ip_address=request.client.host if request.client else None,
        status="success",
    )
    db.add(audit_log)
    await db.commit()
    
    return invoice


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get invoice by ID"""
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )
    
    return invoice


@router.patch("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: int,
    request: Request,
    update_data: InvoiceUpdate,
    current_admin: AdminUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update an invoice"""
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )
    
    if invoice.status == InvoiceStatus.PAID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify a paid invoice",
        )
    
    update_fields = update_data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(invoice, field, value)
    
    await db.commit()
    await db.refresh(invoice)
    
    # Log action
    audit_log = AuditLog(
        admin_user_id=current_admin.id,
        action="invoice.update",
        resource_type="invoice",
        resource_id=str(invoice.id),
        details=update_fields,
        ip_address=request.client.host if request.client else None,
        status="success",
    )
    db.add(audit_log)
    await db.commit()
    
    return invoice


@router.post("/{invoice_id}/send")
async def send_invoice(
    invoice_id: int,
    request: Request,
    current_admin: AdminUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Send invoice to tenant"""
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )
    
    if invoice.status not in [InvoiceStatus.DRAFT, InvoiceStatus.PENDING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice cannot be sent in current status",
        )
    
    # Get tenant email
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == invoice.tenant_id)
    )
    tenant = tenant_result.scalar_one_or_none()
    
    # TODO: Send email with invoice
    # For now, just update status
    invoice.status = InvoiceStatus.PENDING
    
    await db.commit()
    
    # Log action
    audit_log = AuditLog(
        admin_user_id=current_admin.id,
        action="invoice.send",
        resource_type="invoice",
        resource_id=str(invoice.id),
        details={"tenant_email": tenant.contact_email},
        ip_address=request.client.host if request.client else None,
        status="success",
    )
    db.add(audit_log)
    await db.commit()
    
    return {"message": "Invoice sent", "status": invoice.status.value}


@router.post("/{invoice_id}/mark-paid")
async def mark_invoice_paid(
    invoice_id: int,
    request: Request,
    current_admin: AdminUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Mark invoice as paid"""
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )
    
    if invoice.status == InvoiceStatus.PAID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice is already paid",
        )
    
    invoice.status = InvoiceStatus.PAID
    invoice.paid_at = datetime.utcnow()
    
    await db.commit()
    
    # Log action
    audit_log = AuditLog(
        admin_user_id=current_admin.id,
        action="invoice.mark_paid",
        resource_type="invoice",
        resource_id=str(invoice.id),
        ip_address=request.client.host if request.client else None,
        status="success",
    )
    db.add(audit_log)
    await db.commit()
    
    return {"message": "Invoice marked as paid", "paid_at": invoice.paid_at}


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: int,
    request: Request,
    current_admin: AdminUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a draft invoice"""
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )
    
    if invoice.status != InvoiceStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft invoices can be deleted",
        )
    
    # Log action
    audit_log = AuditLog(
        admin_user_id=current_admin.id,
        action="invoice.delete",
        resource_type="invoice",
        resource_id=str(invoice.id),
        details={"invoice_number": invoice.invoice_number},
        ip_address=request.client.host if request.client else None,
        status="success",
    )
    db.add(audit_log)
    
    await db.delete(invoice)
    await db.commit()
