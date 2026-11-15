import { useState, useEffect, useCallback } from 'react'
import { crmApi, CrmChatRoom, CrmChatMessage } from '@/lib/api/crmApi'
import { useEventSource } from '@/hooks/useEventSource'
import { useAdmin } from '@/components/AdminGuard'

export default function EmployeeMessengerPage() {
    const employee = useAdmin()
    const [rooms, setRooms] = useState<CrmChatRoom[]>([])
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'DEPARTMENT_GROUP' | 'LEAD_THREAD' | 'DIRECT'>('ALL')
    const [selectedRoom, setSelectedRoom] = useState<CrmChatRoom | null>(null)
    const [messages, setMessages] = useState<CrmChatMessage[]>([])
    const [messageText, setMessageText] = useState('')
    const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
    const [editingContent, setEditingContent] = useState('')
    const [expandedHistoryIds, setExpandedHistoryIds] = useState<Record<number, boolean>>({})
    const [newRoomTitle, setNewRoomTitle] = useState('')
    const [newRoomType, setNewRoomType] = useState<'DEPARTMENT_GROUP' | 'DIRECT'>('DEPARTMENT_GROUP')
    const [submitting, setSubmitting] = useState(false)

    const loadRooms = useCallback(async () => {
        try {
            const res = await crmApi.getRooms()
            setRooms(res.data)
            if (!selectedRoom && res.data.length > 0) {
                setSelectedRoom(res.data[0])
            }
        } catch (err) {
            console.error('Ошибка загрузки чатов:', err)
        }
    }, [selectedRoom])

    const loadMessages = useCallback(async (roomId: number) => {
        try {
            const res = await crmApi.getMessages(roomId)
            setMessages(res.data)
        } catch (err) {
            console.error('Ошибка загрузки сообщений:', err)
        }
    }, [])

    useEffect(() => {
        loadRooms()
    }, [loadRooms])

    useEffect(() => {
        if (selectedRoom) {
            loadMessages(selectedRoom.id)
        }
    }, [selectedRoom, loadMessages])

    useEventSource({
        eventTypes: ['crm_chat_message'],
        onEvent: (ev) => {
            loadRooms()
            if (selectedRoom && ev.data?.roomId === selectedRoom.id) {
                loadMessages(selectedRoom.id)
            }
        },
    })

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedRoom || !messageText.trim() || submitting) return
        setSubmitting(true)
        try {
            await crmApi.sendMessage(selectedRoom.id, { content: messageText.trim() })
            setMessageText('')
            await loadMessages(selectedRoom.id)
            await loadRooms()
        } finally {
            setSubmitting(false)
        }
    }

    const handleSaveEdit = async (messageId: number) => {
        if (!editingContent.trim() || submitting) return
        setSubmitting(true)
        try {
            await crmApi.editMessage(messageId, editingContent.trim())
            setEditingMessageId(null)
            setEditingContent('')
            if (selectedRoom) {
                await loadMessages(selectedRoom.id)
            }
        } finally {
            setSubmitting(false)
        }
    }

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newRoomTitle.trim() || submitting) return
        setSubmitting(true)
        try {
            const res = await crmApi.createRoom({
                roomType: newRoomType,
                title: newRoomTitle.trim(),
            })
            setNewRoomTitle('')
            await loadRooms()
            setSelectedRoom(res.data)
        } finally {
            setSubmitting(false)
        }
    }

    const filteredRooms = rooms.filter((r) => activeFilter === 'ALL' || r.roomType === activeFilter)

    const parseEditHistory = (jsonStr: string): Array<{ previousContent: string; editedAt?: string; editedBy?: string }> => {
        try {
            const parsed = JSON.parse(jsonStr || '[]')
            return Array.isArray(parsed) ? parsed : []
        } catch {
            return []
        }
    }

    return (
        <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">💬 Единый мессенджер сотрудников</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Командные каналы отделов, чаты по сделкам воронки и полная историчность всех правок сообщений
                    </p>
                </div>

                <form onSubmit={handleCreateRoom} className="flex flex-wrap items-center gap-2">
                    <select
                        value={newRoomType}
                        onChange={(e) => setNewRoomType(e.target.value as 'DEPARTMENT_GROUP' | 'DIRECT')}
                        className="rounded-lg bg-gray-800 border border-gray-700 text-xs text-white px-3 py-2"
                    >
                        <option value="DEPARTMENT_GROUP">🏢 Группа / Отдел</option>
                        <option value="DIRECT">👤 Личный чат</option>
                    </select>
                    <input
                        type="text"
                        value={newRoomTitle}
                        onChange={(e) => setNewRoomTitle(e.target.value)}
                        placeholder="Название нового чата..."
                        className="rounded-lg bg-gray-800 border border-gray-700 text-xs text-white px-3 py-2"
                    />
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-3.5 py-2 rounded-lg bg-amber-500 text-gray-950 font-semibold text-xs hover:bg-amber-400 transition"
                    >
                        + Создать чат
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px]">
                {/* Left Sidebar: Rooms */}
                <div className="lg:col-span-4 bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col h-full">
                    <div className="flex flex-wrap gap-1.5 pb-3 border-b border-gray-800">
                        {[
                            { key: 'ALL', label: 'Все' },
                            { key: 'DEPARTMENT_GROUP', label: '🏢 Отделы' },
                            { key: 'LEAD_THREAD', label: '🤝 Сделки' },
                            { key: 'DIRECT', label: '👤 Личные' },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveFilter(tab.key as any)}
                                className={`text-xs px-2.5 py-1.5 rounded-lg transition ${
                                    activeFilter === tab.key
                                        ? 'bg-amber-500 text-gray-950 font-semibold'
                                        : 'bg-gray-800 text-gray-400 hover:text-white'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
                        {filteredRooms.map((room) => {
                            const isSelected = selectedRoom?.id === room.id
                            return (
                                <div
                                    key={room.id}
                                    onClick={() => setSelectedRoom(room)}
                                    className={`p-3 rounded-xl border cursor-pointer transition ${
                                        isSelected
                                            ? 'bg-amber-500/10 border-amber-500/40'
                                            : 'bg-gray-800/40 border-gray-800 hover:border-gray-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-semibold text-sm text-white truncate">{room.title}</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                                            {room.roomType === 'LEAD_THREAD'
                                                ? 'Сделка'
                                                : room.roomType === 'DIRECT'
                                                ? 'Личный'
                                                : 'Отдел'}
                                        </span>
                                    </div>
                                    {room.lastMessagePreview && (
                                        <p className="text-xs text-gray-400 mt-1 truncate">{room.lastMessagePreview}</p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Right Area: Message Stream with Edit History Audit */}
                <div className="lg:col-span-8 bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col h-full">
                    {!selectedRoom ? (
                        <div className="my-auto text-center text-gray-500">Выберите чат слева</div>
                    ) : (
                        <>
                            <div className="pb-3 border-b border-gray-800 flex items-center justify-between">
                                <div>
                                    <h2 className="text-base font-bold text-white">{selectedRoom.title}</h2>
                                    <p className="text-xs text-gray-400">
                                        🔒 Режим полной историчности: все изменения сообщений фиксируются в неизменяемом журнале
                                    </p>
                                </div>
                                {selectedRoom.leadId && (
                                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                        Лид #{selectedRoom.leadId}
                                    </span>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-2">
                                {messages.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-12">
                                        Сообщений пока нет. Начните обсуждение!
                                    </p>
                                ) : (
                                    messages.map((msg) => {
                                        const isMe =
                                            msg.senderId === employee.id && msg.senderRole === employee.userType
                                        const editHistory = parseEditHistory(msg.editHistoryJson)
                                        const isHistoryOpen = !!expandedHistoryIds[msg.id]

                                        if (msg.isSystemEvent) {
                                            return (
                                                <div
                                                    key={msg.id}
                                                    className="bg-purple-500/10 border border-purple-500/20 text-purple-200 rounded-lg px-3 py-2 text-xs text-center"
                                                >
                                                    ⚡ <span className="font-semibold">{msg.senderName}:</span> {msg.content}{' '}
                                                    <span className="text-gray-500 ml-2">
                                                        ({new Date(msg.createdAt).toLocaleString('ru-RU')})
                                                    </span>
                                                </div>
                                            )
                                        }

                                        return (
                                            <div
                                                key={msg.id}
                                                className={`p-3 rounded-xl border max-w-2xl ${
                                                    isMe
                                                        ? 'ml-auto bg-amber-500/10 border-amber-500/30'
                                                        : 'bg-gray-800/70 border-gray-700/70'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-4 text-xs mb-1">
                                                    <span className="font-bold text-amber-400">
                                                        {msg.senderName}{' '}
                                                        <span className="text-[10px] text-gray-400 font-normal">
                                                            ({msg.senderRole})
                                                        </span>
                                                    </span>
                                                    <span className="text-[11px] text-gray-500">
                                                        {new Date(msg.createdAt).toLocaleString('ru-RU')}
                                                    </span>
                                                </div>

                                                {editingMessageId === msg.id ? (
                                                    <div className="space-y-2 mt-2">
                                                        <textarea
                                                            rows={2}
                                                            value={editingContent}
                                                            onChange={(e) => setEditingContent(e.target.value)}
                                                            className="w-full rounded bg-gray-900 border border-gray-700 text-xs text-white p-2"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleSaveEdit(msg.id)}
                                                                className="text-xs px-3 py-1 rounded bg-emerald-600 text-white"
                                                            >
                                                                Сохранить (прежняя версия останется в истории)
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingMessageId(null)}
                                                                className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300"
                                                            >
                                                                Отмена
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-100 whitespace-pre-wrap">{msg.content}</p>
                                                )}

                                                <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-800/60 text-[11px] text-gray-400">
                                                    <div className="flex items-center gap-2">
                                                        {msg.isEdited && (
                                                            <button
                                                                onClick={() =>
                                                                    setExpandedHistoryIds((prev) => ({
                                                                        ...prev,
                                                                        [msg.id]: !prev[msg.id],
                                                                    }))
                                                                }
                                                                className="text-amber-300 hover:underline"
                                                            >
                                                                📜 Изменено ({editHistory.length}) —{' '}
                                                                {isHistoryOpen ? 'скрыть историю' : 'показать историю правок'}
                                                            </button>
                                                        )}
                                                    </div>
                                                    {isMe && editingMessageId !== msg.id && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingMessageId(msg.id)
                                                                setEditingContent(msg.content)
                                                            }}
                                                            className="text-gray-400 hover:text-white"
                                                        >
                                                            ✎ Изменить
                                                        </button>
                                                    )}
                                                </div>

                                                {msg.isEdited && isHistoryOpen && editHistory.length > 0 && (
                                                    <div className="mt-2 p-2 rounded bg-gray-950/80 border border-gray-800 space-y-1 text-xs">
                                                        <p className="text-[10px] font-semibold text-gray-400 uppercase">
                                                            Неизменяемый архив предыдущих редакций:
                                                        </p>
                                                        {editHistory.map((h, idx) => (
                                                            <div key={idx} className="text-gray-300 border-l-2 border-amber-500/40 pl-2">
                                                                <p className="line-through text-gray-400">{h.previousContent}</p>
                                                                {h.editedAt && (
                                                                    <p className="text-[10px] text-gray-500">
                                                                        Редакция от {new Date(h.editedAt).toLocaleString('ru-RU')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                )}
                            </div>

                            <form onSubmit={handleSendMessage} className="pt-3 border-t border-gray-800 flex gap-2">
                                <input
                                    type="text"
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    placeholder="Введите сообщение сотрудникам..."
                                    className="flex-1 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white px-4 py-2.5 focus:border-amber-500 focus:outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm transition"
                                >
                                    Отправить
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
