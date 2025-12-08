import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, Calendar, User } from 'lucide-react';
import { boardsApi, columnsApi, cardsApi, groupsApi } from '../api/client';
import type { BoardDetail, BoardCard, GroupDetail } from '../types';

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

export default function BoardPage() {
  const { groupId, boardId } = useParams<{ groupId: string; boardId: string }>();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [draggingCard, setDraggingCard] = useState<BoardCard | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<number | null>(null);

  useEffect(() => {
    if (groupId && boardId) {
      loadData();
    }
  }, [groupId, boardId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupData, boardData] = await Promise.all([
        groupsApi.get(parseInt(groupId!)),
        boardsApi.get(parseInt(boardId!)),
      ]);
      setGroup(groupData);
      setBoard(boardData);
    } catch (err) {
      console.error('Failed to load board:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (columnId: number) => {
    const title = prompt('Enter card title:');
    if (!title?.trim()) return;

    try {
      const newCard = await cardsApi.create(columnId, title.trim());
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === columnId ? { ...col, cards: [...col.cards, newCard] } : col
          ),
        };
      });
    } catch (err) {
      console.error('Failed to create card:', err);
    }
  };

  const handleDeleteCard = async (cardId: number, columnId: number) => {
    if (!confirm('Delete this card?')) return;

    try {
      await cardsApi.delete(cardId);
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === columnId
              ? { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
              : col
          ),
        };
      });
    } catch (err) {
      console.error('Failed to delete card:', err);
    }
  };

  const handleAddColumn = async () => {
    const title = prompt('Enter column title:');
    if (!title?.trim() || !board) return;

    try {
      const newColumn = await columnsApi.create(board.id, title.trim());
      setBoard((prev) =>
        prev ? { ...prev, columns: [...prev.columns, { ...newColumn, cards: [] }] } : prev
      );
    } catch (err) {
      console.error('Failed to create column:', err);
    }
  };

  const handleDragStart = (card: BoardCard) => {
    setDraggingCard(card);
  };

  const handleDragOver = (e: React.DragEvent, columnId: number) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: number) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggingCard || draggingCard.column_id === targetColumnId) {
      setDraggingCard(null);
      return;
    }

    const sourceColumnId = draggingCard.column_id;
    const cardId = draggingCard.id;

    // Optimistic update
    setBoard((prev) => {
      if (!prev) return prev;

      const updatedCard = { ...draggingCard, column_id: targetColumnId };
      return {
        ...prev,
        columns: prev.columns.map((col) => {
          if (col.id === sourceColumnId) {
            return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
          }
          if (col.id === targetColumnId) {
            return { ...col, cards: [...col.cards, updatedCard] };
          }
          return col;
        }),
      };
    });

    setDraggingCard(null);

    try {
      await cardsApi.move(cardId, targetColumnId, 0);
    } catch (err) {
      console.error('Failed to move card:', err);
      loadData(); // Reload on error
    }
  };

  const formatDueDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    const isOverdue = date < today;
    return {
      text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      isOverdue,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!board || !group) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-600 mb-4">Board not found</p>
        <Link to="/groups" className="text-primary-500 hover:underline">
          Back to Groups
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link
          to={`/groups/${group.id}`}
          className="text-gray-400 hover:text-gray-600 flex items-center gap-1"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>{group.name}</span>
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">{board.name}</h1>
      </header>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6 bg-gray-50">
        <div className="flex gap-6 h-full">
          {board.columns.map((column) => (
            <div
              key={column.id}
              className={`w-80 flex-shrink-0 bg-gray-100 rounded-xl p-4 flex flex-col kanban-column ${
                dragOverColumn === column.id ? 'ring-2 ring-primary-400' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: column.color }}
                  ></div>
                  <h3 className="font-semibold text-gray-900">{column.title}</h3>
                  <span className="text-sm text-gray-400">{column.cards.length}</span>
                </div>
                <button
                  onClick={() => handleAddCard(column.id)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-3 overflow-y-auto">
                {column.cards.map((card) => {
                  const dueDate = formatDueDate(card.due_date);
                  return (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={() => handleDragStart(card)}
                      className={`bg-white rounded-lg p-4 shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-shadow ${
                        draggingCard?.id === card.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-gray-900 flex-1">{card.title}</h4>
                        <button
                          onClick={() => handleDeleteCard(card.id, column.id)}
                          className="text-gray-300 hover:text-red-500 p-1 -m-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {card.description && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                          {card.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        {/* Priority */}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            PRIORITY_COLORS[card.priority]
                          }`}
                        >
                          {card.priority}
                        </span>

                        {/* Due Date */}
                        {dueDate && (
                          <span
                            className={`text-xs flex items-center gap-1 ${
                              dueDate.isOverdue ? 'text-red-500' : 'text-gray-500'
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            {dueDate.text}
                          </span>
                        )}

                        {/* Assignee */}
                        {card.assigned_name && (
                          <span className="text-xs flex items-center gap-1 text-gray-500">
                            <User className="w-3 h-3" />
                            {card.assigned_name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Card Button */}
              <button
                onClick={() => handleAddCard(column.id)}
                className="mt-3 w-full py-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Card</span>
              </button>
            </div>
          ))}

          {/* Add Column */}
          <button
            onClick={handleAddColumn}
            className="w-80 flex-shrink-0 bg-gray-100/50 hover:bg-gray-100 rounded-xl p-4 border-2 border-dashed border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Column</span>
          </button>
        </div>
      </div>
    </div>
  );
}
