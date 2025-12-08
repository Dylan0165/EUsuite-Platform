from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from datetime import datetime
import uuid
from ..database import get_db
from ..models import SupportTicket, TicketMessage, Tenant, AdminUser, AuditLog
from ..schemas import (
    SupportTicketCreate, SupportTicketUpdate, SupportTicketResponse,
    SupportTicketDetailResponse, TicketMessageCreate, TicketMessageResponse,
    PaginatedResponse
)
from ..auth import get_current_admin, require_admin, require_support

router = APIRouter(prefix="/tickets", tags=["Support Tickets"])


def generate_ticket_number() -> str:
    """Generate a unique ticket number"""
    timestamp = datetime.utcnow().strftime("%Y%m%d")
    unique = uuid.uuid4().hex[:4].upper()
    return f"TKT-{timestamp}-{unique}"


@router.get("", response_model=PaginatedResponse)
async def list_tickets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tenant_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = None,
    assigned_to: Optional[int] = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all support tickets with pagination"""
    query = select(SupportTicket)
    count_query = select(func.count(SupportTicket.id))
    
    if tenant_id:
        query = query.where(SupportTicket.tenant_id == tenant_id)
        count_query = count_query.where(SupportTicket.tenant_id == tenant_id)
    
    if status_filter:
        query = query.where(SupportTicket.status == status_filter)
        count_query = count_query.where(SupportTicket.status == status_filter)
    
    if priority:
        query = query.where(SupportTicket.priority == priority)
        count_query = count_query.where(SupportTicket.priority == priority)
    
    if assigned_to:
        query = query.where(SupportTicket.assigned_to == assigned_to)
        count_query = count_query.where(SupportTicket.assigned_to == assigned_to)
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Get paginated results
    offset = (page - 1) * page_size
    query = query.order_by(SupportTicket.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    tickets = result.scalars().all()
    
    return PaginatedResponse(
        items=[SupportTicketResponse.model_validate(t) for t in tickets],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=SupportTicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    request: Request,
    ticket_data: SupportTicketCreate,
    current_admin: AdminUser = Depends(require_support),
    db: AsyncSession = Depends(get_db),
):
    """Create a new support ticket"""
    # Verify tenant exists
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == ticket_data.tenant_id)
    )
    tenant = tenant_result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )
    
    ticket = SupportTicket(
        tenant_id=ticket_data.tenant_id,
        ticket_number=generate_ticket_number(),
        subject=ticket_data.subject,
        description=ticket_data.description,
        priority=ticket_data.priority,
        category=ticket_data.category,
        requester_email=ticket_data.requester_email or tenant.contact_email,
        requester_name=ticket_data.requester_name or tenant.contact_name,
        status="open",
    )
    
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    
    return ticket


@router.get("/{ticket_id}", response_model=SupportTicketDetailResponse)
async def get_ticket(
    ticket_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get ticket details by ID"""
    result = await db.execute(
        select(SupportTicket).where(SupportTicket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )
    
    # Get messages
    messages_result = await db.execute(
        select(TicketMessage)
        .where(TicketMessage.ticket_id == ticket_id)
        .order_by(TicketMessage.created_at)
    )
    messages = messages_result.scalars().all()
    
    response = SupportTicketDetailResponse.model_validate(ticket)
    response.messages = [TicketMessageResponse.model_validate(m) for m in messages]
    
    return response


@router.patch("/{ticket_id}", response_model=SupportTicketResponse)
async def update_ticket(
    ticket_id: int,
    request: Request,
    update_data: SupportTicketUpdate,
    current_admin: AdminUser = Depends(require_support),
    db: AsyncSession = Depends(get_db),
):
    """Update a support ticket"""
    result = await db.execute(
        select(SupportTicket).where(SupportTicket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )
    
    update_fields = update_data.model_dump(exclude_unset=True)
    
    # Handle resolution
    if update_data.status == "resolved" and ticket.status != "resolved":
        ticket.resolved_at = datetime.utcnow()
    
    for field, value in update_fields.items():
        setattr(ticket, field, value)
    
    await db.commit()
    await db.refresh(ticket)
    
    # Log action
    audit_log = AuditLog(
        admin_user_id=current_admin.id,
        action="ticket.update",
        resource_type="ticket",
        resource_id=str(ticket.id),
        details=update_fields,
        ip_address=request.client.host if request.client else None,
        status="success",
    )
    db.add(audit_log)
    await db.commit()
    
    return ticket


@router.post("/{ticket_id}/messages", response_model=TicketMessageResponse, status_code=status.HTTP_201_CREATED)
async def add_ticket_message(
    ticket_id: int,
    message_data: TicketMessageCreate,
    current_admin: AdminUser = Depends(require_support),
    db: AsyncSession = Depends(get_db),
):
    """Add a message to a support ticket"""
    result = await db.execute(
        select(SupportTicket).where(SupportTicket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )
    
    message = TicketMessage(
        ticket_id=ticket_id,
        message=message_data.message,
        is_internal=message_data.is_internal,
        is_from_admin=True,
        sender_name=f"{current_admin.first_name} {current_admin.last_name}",
        sender_email=current_admin.email,
        attachments=message_data.attachments,
    )
    
    db.add(message)
    
    # Update ticket status if it's waiting
    if ticket.status == "waiting":
        ticket.status = "in_progress"
    
    await db.commit()
    await db.refresh(message)
    
    return message


@router.post("/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: int,
    request: Request,
    admin_id: int,
    current_admin: AdminUser = Depends(require_support),
    db: AsyncSession = Depends(get_db),
):
    """Assign a ticket to an admin"""
    result = await db.execute(
        select(SupportTicket).where(SupportTicket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )
    
    # Verify admin exists
    admin_result = await db.execute(
        select(AdminUser).where(AdminUser.id == admin_id)
    )
    admin = admin_result.scalar_one_or_none()
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin user not found",
        )
    
    ticket.assigned_to = admin_id
    if ticket.status == "open":
        ticket.status = "in_progress"
    
    await db.commit()
    
    # Log action
    audit_log = AuditLog(
        admin_user_id=current_admin.id,
        action="ticket.assign",
        resource_type="ticket",
        resource_id=str(ticket.id),
        details={"assigned_to": admin_id, "admin_email": admin.email},
        ip_address=request.client.host if request.client else None,
        status="success",
    )
    db.add(audit_log)
    await db.commit()
    
    return {"message": "Ticket assigned", "assigned_to": admin.email}


@router.post("/{ticket_id}/close")
async def close_ticket(
    ticket_id: int,
    request: Request,
    current_admin: AdminUser = Depends(require_support),
    db: AsyncSession = Depends(get_db),
):
    """Close a support ticket"""
    result = await db.execute(
        select(SupportTicket).where(SupportTicket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )
    
    ticket.status = "closed"
    
    await db.commit()
    
    # Log action
    audit_log = AuditLog(
        admin_user_id=current_admin.id,
        action="ticket.close",
        resource_type="ticket",
        resource_id=str(ticket.id),
        ip_address=request.client.host if request.client else None,
        status="success",
    )
    db.add(audit_log)
    await db.commit()
    
    return {"message": "Ticket closed"}
