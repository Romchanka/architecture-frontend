import api from '@/lib/api'

export type CrmLeadStage =
    | 'NEW_POOL'
    | 'CALL_IN_PROGRESS'
    | 'NO_ANSWER'
    | 'CALLBACK_SCHEDULED'
    | 'MEETING_SCHEDULED'
    | 'MEETING_COMPLETED'
    | 'BOOKED'
    | 'CONTRACT_SIGNING'
    | 'CONTRACT_SIGNED'
    | 'REJECTED'

export type CrmCallOutcome =
    | 'ANSWERED_INTERESTED'
    | 'CALLBACK_REQUESTED'
    | 'MEETING_AGREED'
    | 'NO_ANSWER'
    | 'BUSY'
    | 'WRONG_NUMBER'
    | 'REJECTED'

export interface CrmLead {
    id: number
    companyId: number | null
    batchId: number | null
    fullName: string
    phone: string
    secondaryPhone: string | null
    source: string
    stage: CrmLeadStage
    assignedToId: number | null
    assignedToName: string | null
    assignedToRole: string | null
    lockedById: number | null
    lockedByName: string | null
    lockedUntil: string | null
    nextContactAt: string | null
    lastCalledAt: string | null
    callAttempts: number
    meetingScheduledAt: string | null
    interestedComplexId: number | null
    interestedApartmentId: number | null
    interestedParkingId: number | null
    calendarEventId: number | null
    bookingId: number | null
    contractId: number | null
    rejectionReason: string | null
    notes: string | null
    createdAt: string
    updatedAt: string
}

export interface CrmCallLog {
    id: number
    leadId: number
    employeeId: number
    employeeName: string
    employeeRole: string
    outcome: CrmCallOutcome
    durationSeconds: number
    comment: string | null
    nextActionAt: string | null
    stageBefore: string | null
    stageAfter: string | null
    createdAt: string
}

export interface CrmLeadTimelineItem {
    id: number
    leadId: number
    eventType: string
    oldValue: string | null
    newValue: string | null
    summary: string
    actorId: number
    actorName: string
    actorRole: string
    createdAt: string
}

export interface CrmImportBatch {
    id: number
    fileName: string
    totalRows: number
    importedCount: number
    duplicateCount: number
    createdByName: string
    createdAt: string
}

export interface CrmFunnelAnalytics {
    totalLeads: number
    totalCallAttempts: number
    reachedMeetingCount: number
    reachedContractCount: number
    callToMeetingRatePercent: number
    meetingToContractRatePercent: number
    stageCounts: Record<CrmLeadStage, number>
    importBatches: CrmImportBatch[]
}

export interface CrmChatRoom {
    id: number
    companyId: number | null
    roomType: 'DEPARTMENT_GROUP' | 'LEAD_THREAD' | 'DIRECT'
    title: string
    departmentCode: string | null
    leadId: number | null
    contractId: number | null
    createdById: number
    createdByName: string
    lastMessagePreview: string | null
    lastMessageAt: string | null
    createdAt: string
}

export interface CrmChatMessage {
    id: number
    roomId: number
    senderId: number
    senderName: string
    senderRole: string
    replyToMessageId: number | null
    content: string
    attachmentUrl: string | null
    attachmentName: string | null
    isEdited: boolean
    editHistoryJson: string
    isSystemEvent: boolean
    createdAt: string
    updatedAt: string
}

export const crmApi = {
    getLeads: (params?: { stage?: CrmLeadStage; onlyMine?: boolean }) =>
        api.get<CrmLead[]>('/crm/funnel/leads', { params }),

    createLead: (payload: {
        fullName: string
        phone: string
        source?: string
        notes?: string
        interestedComplexId?: number
    }) => api.post<CrmLead>('/crm/funnel/leads', payload),

    importSheet: (payload: {
        fileName: string
        source?: string
        rows: Array<{ fullName: string; phone: string; secondaryPhone?: string; notes?: string }>
    }) => api.post<{
        batchId: number
        fileName: string
        totalRows: number
        importedCount: number
        duplicateCount: number
        leads: CrmLead[]
    }>('/crm/funnel/leads/import', payload),

    claimNextDialerLead: () =>
        api.post<{ hasNext: boolean; lead?: CrmLead }>('/crm/funnel/dialer/next'),

    logCallOutcome: (
        leadId: number,
        payload: {
            outcome: CrmCallOutcome
            durationSeconds?: number
            comment?: string
            nextContactAt?: string
            meetingScheduledAt?: string
            rejectionReason?: string
        }
    ) => api.post<CrmLead>(`/crm/funnel/leads/${leadId}/call-result`, payload),

    transitionStage: (
        leadId: number,
        payload: {
            targetStage: CrmLeadStage
            comment?: string
            meetingScheduledAt?: string
            nextContactAt?: string
            bookingId?: number
            contractId?: number
            rejectionReason?: string
        }
    ) => api.post<CrmLead>(`/crm/funnel/leads/${leadId}/stage`, payload),

    getLeadHistory: (leadId: number) =>
        api.get<{
            lead: CrmLead
            callLogs: CrmCallLog[]
            timeline: CrmLeadTimelineItem[]
            threadRoomId: number
        }>(`/crm/funnel/leads/${leadId}/history`),

    getAnalytics: () =>
        api.get<CrmFunnelAnalytics>('/crm/funnel/analytics'),

    // Messenger
    getRooms: () =>
        api.get<CrmChatRoom[]>('/crm/messenger/rooms'),

    createRoom: (payload: {
        roomType: 'DEPARTMENT_GROUP' | 'LEAD_THREAD' | 'DIRECT'
        title: string
        leadId?: number
        targetEmployeeId?: number
        targetEmployeeName?: string
        targetEmployeeRole?: string
    }) => api.post<CrmChatRoom>('/crm/messenger/rooms', payload),

    getMessages: (roomId: number) =>
        api.get<CrmChatMessage[]>(`/crm/messenger/rooms/${roomId}/messages`),

    sendMessage: (roomId: number, payload: { content: string; replyToMessageId?: number }) =>
        api.post<CrmChatMessage>(`/crm/messenger/rooms/${roomId}/messages`, payload),

    editMessage: (messageId: number, content: string) =>
        api.put<CrmChatMessage>(`/crm/messenger/messages/${messageId}`, { content }),
}
