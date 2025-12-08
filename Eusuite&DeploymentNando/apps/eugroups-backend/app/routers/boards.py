"""
Boards Router - Kanban board management with columns and cards
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import Group, GroupMember, Board, BoardColumn, BoardCard
from ..schemas import (
    BoardCreate, BoardResponse, BoardDetailResponse, BoardListResponse,
    BoardColumnCreate, BoardColumnUpdate, BoardColumnResponse,
    BoardCardCreate, BoardCardUpdate, BoardCardResponse
)
from ..utils.auth_client import get_current_user

router = APIRouter(tags=["Boards"])


def check_group_membership(db: Session, group_id: int, user_id: str) -> GroupMember:
    """Check if user is a member of the group"""
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Must be a group member")
    return member


def get_board_or_404(db: Session, board_id: int) -> Board:
    """Get board or raise 404"""
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return board


# ============ Board CRUD ============

@router.get("/groups/{group_id}/boards", response_model=BoardListResponse)
async def list_boards(
    group_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all boards in a group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    check_group_membership(db, group_id, user["user_id"])
    
    boards = db.query(Board).filter(Board.group_id == group_id).order_by(Board.created_at).all()
    
    return BoardListResponse(
        boards=[BoardResponse.model_validate(b) for b in boards],
        total=len(boards)
    )


@router.post("/groups/{group_id}/boards", response_model=BoardDetailResponse, status_code=201)
async def create_board(
    group_id: int,
    board_data: BoardCreate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new board with default columns"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    membership = check_group_membership(db, group_id, user["user_id"])
    
    # Only admins can create boards
    if membership.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create boards")
    
    board = Board(
        group_id=group_id,
        name=board_data.name,
        description=board_data.description
    )
    db.add(board)
    db.flush()
    
    # Create default columns
    default_columns = [
        BoardColumn(board_id=board.id, title="To Do", order_index=0, color="#EF4444"),
        BoardColumn(board_id=board.id, title="In Progress", order_index=1, color="#F59E0B"),
        BoardColumn(board_id=board.id, title="Done", order_index=2, color="#22C55E")
    ]
    for col in default_columns:
        db.add(col)
    
    db.commit()
    db.refresh(board)
    
    columns = db.query(BoardColumn).filter(
        BoardColumn.board_id == board.id
    ).order_by(BoardColumn.order_index).all()
    
    return BoardDetailResponse(
        id=board.id,
        group_id=board.group_id,
        name=board.name,
        description=board.description,
        created_at=board.created_at,
        columns=[BoardColumnResponse(
            id=c.id,
            board_id=c.board_id,
            title=c.title,
            order_index=c.order_index,
            color=c.color,
            cards=[]
        ) for c in columns]
    )


@router.get("/boards/{board_id}", response_model=BoardDetailResponse)
async def get_board(
    board_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get board with columns and cards"""
    board = get_board_or_404(db, board_id)
    check_group_membership(db, board.group_id, user["user_id"])
    
    columns = db.query(BoardColumn).filter(
        BoardColumn.board_id == board_id
    ).order_by(BoardColumn.order_index).all()
    
    columns_response = []
    for col in columns:
        cards = db.query(BoardCard).filter(
            BoardCard.column_id == col.id
        ).order_by(BoardCard.order_index).all()
        
        columns_response.append(BoardColumnResponse(
            id=col.id,
            board_id=col.board_id,
            title=col.title,
            order_index=col.order_index,
            color=col.color,
            cards=[BoardCardResponse.model_validate(card) for card in cards]
        ))
    
    return BoardDetailResponse(
        id=board.id,
        group_id=board.group_id,
        name=board.name,
        description=board.description,
        created_at=board.created_at,
        columns=columns_response
    )


@router.delete("/boards/{board_id}", status_code=204)
async def delete_board(
    board_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a board (admin only)"""
    board = get_board_or_404(db, board_id)
    membership = check_group_membership(db, board.group_id, user["user_id"])
    
    if membership.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete boards")
    
    db.delete(board)
    db.commit()


# ============ Column CRUD ============

@router.post("/boards/{board_id}/columns", response_model=BoardColumnResponse, status_code=201)
async def create_column(
    board_id: int,
    column_data: BoardColumnCreate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new column in a board"""
    board = get_board_or_404(db, board_id)
    check_group_membership(db, board.group_id, user["user_id"])
    
    # Get max order_index
    max_order = db.query(func.max(BoardColumn.order_index)).filter(
        BoardColumn.board_id == board_id
    ).scalar() or -1
    
    column = BoardColumn(
        board_id=board_id,
        title=column_data.title,
        order_index=max_order + 1,
        color=column_data.color or "#6B7280"
    )
    db.add(column)
    db.commit()
    db.refresh(column)
    
    return BoardColumnResponse(
        id=column.id,
        board_id=column.board_id,
        title=column.title,
        order_index=column.order_index,
        color=column.color,
        cards=[]
    )


@router.put("/columns/{column_id}", response_model=BoardColumnResponse)
async def update_column(
    column_id: int,
    column_data: BoardColumnUpdate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a column"""
    column = db.query(BoardColumn).filter(BoardColumn.id == column_id).first()
    if not column:
        raise HTTPException(status_code=404, detail="Column not found")
    
    board = get_board_or_404(db, column.board_id)
    check_group_membership(db, board.group_id, user["user_id"])
    
    if column_data.title is not None:
        column.title = column_data.title
    if column_data.order_index is not None:
        column.order_index = column_data.order_index
    if column_data.color is not None:
        column.color = column_data.color
    
    db.commit()
    db.refresh(column)
    
    cards = db.query(BoardCard).filter(BoardCard.column_id == column.id).order_by(BoardCard.order_index).all()
    
    return BoardColumnResponse(
        id=column.id,
        board_id=column.board_id,
        title=column.title,
        order_index=column.order_index,
        color=column.color,
        cards=[BoardCardResponse.model_validate(card) for card in cards]
    )


@router.delete("/columns/{column_id}", status_code=204)
async def delete_column(
    column_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a column"""
    column = db.query(BoardColumn).filter(BoardColumn.id == column_id).first()
    if not column:
        raise HTTPException(status_code=404, detail="Column not found")
    
    board = get_board_or_404(db, column.board_id)
    membership = check_group_membership(db, board.group_id, user["user_id"])
    
    if membership.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete columns")
    
    db.delete(column)
    db.commit()


@router.put("/boards/{board_id}/columns/reorder")
async def reorder_columns(
    board_id: int,
    column_ids: List[int],
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reorder columns in a board"""
    board = get_board_or_404(db, board_id)
    check_group_membership(db, board.group_id, user["user_id"])
    
    for index, col_id in enumerate(column_ids):
        db.query(BoardColumn).filter(
            BoardColumn.id == col_id,
            BoardColumn.board_id == board_id
        ).update({"order_index": index})
    
    db.commit()
    return {"message": "Columns reordered"}


# ============ Card CRUD ============

@router.post("/columns/{column_id}/cards", response_model=BoardCardResponse, status_code=201)
async def create_card(
    column_id: int,
    card_data: BoardCardCreate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new card in a column"""
    column = db.query(BoardColumn).filter(BoardColumn.id == column_id).first()
    if not column:
        raise HTTPException(status_code=404, detail="Column not found")
    
    board = get_board_or_404(db, column.board_id)
    check_group_membership(db, board.group_id, user["user_id"])
    
    # Get max order_index
    max_order = db.query(func.max(BoardCard.order_index)).filter(
        BoardCard.column_id == column_id
    ).scalar() or -1
    
    card = BoardCard(
        column_id=column_id,
        title=card_data.title,
        description=card_data.description,
        order_index=max_order + 1,
        assigned_to=card_data.assigned_to,
        assigned_name=card_data.assigned_name,
        due_date=card_data.due_date,
        priority=card_data.priority or "medium",
        created_by=user["user_id"]
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    
    return BoardCardResponse.model_validate(card)


@router.put("/cards/{card_id}", response_model=BoardCardResponse)
async def update_card(
    card_id: int,
    card_data: BoardCardUpdate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a card"""
    card = db.query(BoardCard).filter(BoardCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    column = db.query(BoardColumn).filter(BoardColumn.id == card.column_id).first()
    board = get_board_or_404(db, column.board_id)
    check_group_membership(db, board.group_id, user["user_id"])
    
    update_data = card_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(card, field, value)
    
    db.commit()
    db.refresh(card)
    
    return BoardCardResponse.model_validate(card)


@router.delete("/cards/{card_id}", status_code=204)
async def delete_card(
    card_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a card"""
    card = db.query(BoardCard).filter(BoardCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    column = db.query(BoardColumn).filter(BoardColumn.id == card.column_id).first()
    board = get_board_or_404(db, column.board_id)
    check_group_membership(db, board.group_id, user["user_id"])
    
    db.delete(card)
    db.commit()


@router.put("/cards/{card_id}/move")
async def move_card(
    card_id: int,
    target_column_id: int,
    target_index: int = Query(0, ge=0),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Move a card to a different column/position"""
    card = db.query(BoardCard).filter(BoardCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    target_column = db.query(BoardColumn).filter(BoardColumn.id == target_column_id).first()
    if not target_column:
        raise HTTPException(status_code=404, detail="Target column not found")
    
    board = get_board_or_404(db, target_column.board_id)
    check_group_membership(db, board.group_id, user["user_id"])
    
    old_column_id = card.column_id
    
    # Update card's column and order
    card.column_id = target_column_id
    card.order_index = target_index
    
    # Reorder other cards in target column
    db.query(BoardCard).filter(
        BoardCard.column_id == target_column_id,
        BoardCard.id != card_id,
        BoardCard.order_index >= target_index
    ).update({"order_index": BoardCard.order_index + 1})
    
    # Reorder old column if different
    if old_column_id != target_column_id:
        cards_in_old = db.query(BoardCard).filter(
            BoardCard.column_id == old_column_id
        ).order_by(BoardCard.order_index).all()
        for i, c in enumerate(cards_in_old):
            c.order_index = i
    
    db.commit()
    
    return {"message": "Card moved", "column_id": target_column_id, "order_index": target_index}
