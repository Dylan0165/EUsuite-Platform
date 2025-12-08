"""
Groups Router - CRUD operations for groups and members
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import Group, GroupMember, Channel, Board, BoardColumn
from ..schemas import (
    GroupCreate, GroupUpdate, GroupResponse, GroupDetailResponse,
    GroupListResponse, GroupMemberResponse
)
from ..utils.auth_client import get_current_user

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.get("", response_model=GroupListResponse)
async def list_groups(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    my_groups: bool = Query(False, description="Only show groups I'm a member of")
):
    """List all groups or only user's groups"""
    query = db.query(Group)
    
    if my_groups:
        # Only groups where user is a member
        member_group_ids = db.query(GroupMember.group_id).filter(
            GroupMember.user_id == user["user_id"]
        ).subquery()
        query = query.filter(Group.id.in_(member_group_ids))
    
    groups = query.order_by(Group.created_at.desc()).all()
    
    # Add member and channel counts
    result = []
    for group in groups:
        member_count = db.query(func.count(GroupMember.id)).filter(
            GroupMember.group_id == group.id
        ).scalar()
        channel_count = db.query(func.count(Channel.id)).filter(
            Channel.group_id == group.id
        ).scalar()
        
        group_dict = {
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "owner_id": group.owner_id,
            "avatar_color": group.avatar_color,
            "created_at": group.created_at,
            "member_count": member_count,
            "channel_count": channel_count
        }
        result.append(GroupResponse(**group_dict))
    
    return GroupListResponse(groups=result, total=len(result))


@router.post("", response_model=GroupDetailResponse, status_code=201)
async def create_group(
    group_data: GroupCreate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new group"""
    # Create the group
    group = Group(
        name=group_data.name,
        description=group_data.description,
        owner_id=user["user_id"],
        avatar_color=group_data.avatar_color or "#3B82F6"
    )
    db.add(group)
    db.flush()  # Get the group ID
    
    # Add creator as admin member
    member = GroupMember(
        group_id=group.id,
        user_id=user["user_id"],
        user_email=user.get("email"),
        user_name=user.get("username"),
        role="admin"
    )
    db.add(member)
    
    # Create default "general" channel
    default_channel = Channel(
        group_id=group.id,
        name="general",
        description="General discussions",
        is_default=True
    )
    db.add(default_channel)
    
    # Create default board with columns
    default_board = Board(
        group_id=group.id,
        name="Tasks",
        description="Group task board"
    )
    db.add(default_board)
    db.flush()
    
    # Add default columns
    columns = [
        BoardColumn(board_id=default_board.id, title="To Do", order_index=0, color="#EF4444"),
        BoardColumn(board_id=default_board.id, title="In Progress", order_index=1, color="#F59E0B"),
        BoardColumn(board_id=default_board.id, title="Done", order_index=2, color="#22C55E")
    ]
    for col in columns:
        db.add(col)
    
    db.commit()
    db.refresh(group)
    
    return GroupDetailResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        owner_id=group.owner_id,
        avatar_color=group.avatar_color,
        created_at=group.created_at,
        member_count=1,
        channel_count=1,
        members=[GroupMemberResponse.model_validate(member)],
        is_member=True,
        user_role="admin"
    )


@router.get("/{group_id}", response_model=GroupDetailResponse)
async def get_group(
    group_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get group details"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    channel_count = db.query(func.count(Channel.id)).filter(
        Channel.group_id == group_id
    ).scalar()
    
    # Check if user is a member
    user_membership = next(
        (m for m in members if m.user_id == user["user_id"]), None
    )
    
    return GroupDetailResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        owner_id=group.owner_id,
        avatar_color=group.avatar_color,
        created_at=group.created_at,
        member_count=len(members),
        channel_count=channel_count,
        members=[GroupMemberResponse.model_validate(m) for m in members],
        is_member=user_membership is not None,
        user_role=user_membership.role if user_membership else None
    )


@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: int,
    group_data: GroupUpdate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a group (admin only)"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user is admin
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user["user_id"]
    ).first()
    
    if not membership or membership.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update the group")
    
    # Update fields
    if group_data.name is not None:
        group.name = group_data.name
    if group_data.description is not None:
        group.description = group_data.description
    if group_data.avatar_color is not None:
        group.avatar_color = group_data.avatar_color
    
    db.commit()
    db.refresh(group)
    
    member_count = db.query(func.count(GroupMember.id)).filter(
        GroupMember.group_id == group.id
    ).scalar()
    channel_count = db.query(func.count(Channel.id)).filter(
        Channel.group_id == group.id
    ).scalar()
    
    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        owner_id=group.owner_id,
        avatar_color=group.avatar_color,
        created_at=group.created_at,
        member_count=member_count,
        channel_count=channel_count
    )


@router.delete("/{group_id}", status_code=204)
async def delete_group(
    group_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a group (owner only)"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.owner_id != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only the owner can delete the group")
    
    # Delete will cascade to members, channels, messages, boards, etc.
    db.delete(group)
    db.commit()


@router.post("/{group_id}/join", response_model=GroupMemberResponse)
async def join_group(
    group_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Join a group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if already a member
    existing = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user["user_id"]
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already a member of this group")
    
    member = GroupMember(
        group_id=group_id,
        user_id=user["user_id"],
        user_email=user.get("email"),
        user_name=user.get("username"),
        role="member"
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    
    return GroupMemberResponse.model_validate(member)


@router.delete("/{group_id}/leave", status_code=204)
async def leave_group(
    group_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Leave a group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.owner_id == user["user_id"]:
        raise HTTPException(status_code=400, detail="Owner cannot leave the group. Transfer ownership or delete the group.")
    
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user["user_id"]
    ).first()
    
    if not member:
        raise HTTPException(status_code=400, detail="Not a member of this group")
    
    db.delete(member)
    db.commit()


@router.get("/{group_id}/members", response_model=List[GroupMemberResponse])
async def list_members(
    group_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List group members"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    return [GroupMemberResponse.model_validate(m) for m in members]


@router.put("/{group_id}/members/{member_id}/role")
async def update_member_role(
    group_id: int,
    member_id: int,
    role: str = Query(..., regex="^(admin|member)$"),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a member's role (admin only)"""
    # Check if user is admin
    admin_check = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user["user_id"],
        GroupMember.role == "admin"
    ).first()
    
    if not admin_check:
        raise HTTPException(status_code=403, detail="Only admins can change roles")
    
    member = db.query(GroupMember).filter(
        GroupMember.id == member_id,
        GroupMember.group_id == group_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Can't change owner's role
    group = db.query(Group).filter(Group.id == group_id).first()
    if member.user_id == group.owner_id:
        raise HTTPException(status_code=400, detail="Cannot change owner's role")
    
    member.role = role
    db.commit()
    
    return {"message": "Role updated", "role": role}


@router.delete("/{group_id}/members/{member_id}", status_code=204)
async def remove_member(
    group_id: int,
    member_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a member from group (admin only)"""
    # Check if user is admin
    admin_check = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user["user_id"],
        GroupMember.role == "admin"
    ).first()
    
    if not admin_check:
        raise HTTPException(status_code=403, detail="Only admins can remove members")
    
    member = db.query(GroupMember).filter(
        GroupMember.id == member_id,
        GroupMember.group_id == group_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Can't remove owner
    group = db.query(Group).filter(Group.id == group_id).first()
    if member.user_id == group.owner_id:
        raise HTTPException(status_code=400, detail="Cannot remove the owner")
    
    db.delete(member)
    db.commit()
