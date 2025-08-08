// Collaborative Editing System - Phase 5
// Real-time collaboration with conflict resolution

import { supabase } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';
import { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';

export interface CollaborativeSession {
  id: string;
  documentId: string;
  documentType: 'content' | 'template' | 'campaign';
  participants: Participant[];
  activeEditors: Map<string, EditorState>;
  changes: DocumentChange[];
  locks: Map<string, DocumentLock>;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Participant {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  cursor?: CursorPosition;
  selection?: TextSelection;
  status: 'active' | 'idle' | 'away';
  lastActivity: Date;
  permissions: {
    canEdit: boolean;
    canComment: boolean;
    canDelete: boolean;
  };
}

export interface EditorState {
  userId: string;
  content: string;
  cursorPosition: number;
  selection?: TextSelection;
  isDirty: boolean;
  lastSaved: Date;
}

export interface CursorPosition {
  line: number;
  column: number;
  index: number;
}

export interface TextSelection {
  start: CursorPosition;
  end: CursorPosition;
  text: string;
}

export interface DocumentChange {
  id: string;
  userId: string;
  userName: string;
  type: 'insert' | 'delete' | 'replace' | 'format';
  position: number;
  content?: string;
  oldContent?: string;
  length?: number;
  timestamp: Date;
  version: number;
}

export interface DocumentLock {
  id: string;
  userId: string;
  userName: string;
  sectionId?: string;
  startIndex: number;
  endIndex: number;
  type: 'edit' | 'delete' | 'format';
  acquiredAt: Date;
  expiresAt: Date;
}

export interface ConflictResolution {
  strategy: 'merge' | 'override' | 'manual';
  conflictingChanges: DocumentChange[];
  resolution?: DocumentChange;
  resolvedBy?: string;
  resolvedAt?: Date;
}

export interface CollaborativeComment {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  position?: number;
  selection?: TextSelection;
  resolved: boolean;
  replies: CollaborativeComment[];
  reactions: Map<string, string[]>; // emoji -> userIds
  createdAt: Date;
  updatedAt: Date;
}

export class CollaborativeEditingSystem {
  private sessions: Map<string, CollaborativeSession> = new Map();
  private channels: Map<string, RealtimeChannel> = new Map();
  private presence: Map<string, RealtimePresenceState> = new Map();
  private changeBuffer: Map<string, DocumentChange[]> = new Map();
  private saveInterval: number = 5000; // Auto-save every 5 seconds
  private conflictThreshold: number = 100; // ms
  
  // Initialize collaborative session
  async initializeSession(
    documentId: string,
    documentType: 'content' | 'template' | 'campaign'
  ): Promise<CollaborativeSession> {
    try {
      // Check if session already exists
      if (this.sessions.has(documentId)) {
        return this.sessions.get(documentId)!;
      }
      
      // Create new session
      const session: CollaborativeSession = {
        id: this.generateId(),
        documentId,
        documentType,
        participants: [],
        activeEditors: new Map(),
        changes: [],
        locks: new Map(),
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Setup real-time channel
      const channel = await this.setupRealtimeChannel(documentId, session);
      this.channels.set(documentId, channel);
      
      // Join session as participant
      await this.joinSession(session);
      
      // Start auto-save
      this.startAutoSave(documentId);
      
      this.sessions.set(documentId, session);
      
      log.info('Collaborative session initialized', { documentId, sessionId: session.id });
      return session;
    } catch (error) {
      log.error('Failed to initialize session', error);
      throw error;
    }
  }
  
  // Setup real-time channel for collaboration
  private async setupRealtimeChannel(
    documentId: string,
    session: CollaborativeSession
  ): Promise<RealtimeChannel> {
    const channel = supabase.channel(`doc:${documentId}`);
    
    // Handle presence updates
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      this.presence.set(documentId, state);
      this.updateParticipants(session, state);
    });
    
    // Handle document changes
    channel.on('broadcast', { event: 'change' }, ({ payload }) => {
      this.handleRemoteChange(session, payload as DocumentChange);
    });
    
    // Handle cursor movements
    channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
      this.handleCursorUpdate(session, payload);
    });
    
    // Handle selection changes
    channel.on('broadcast', { event: 'selection' }, ({ payload }) => {
      this.handleSelectionUpdate(session, payload);
    });
    
    // Handle locks
    channel.on('broadcast', { event: 'lock' }, ({ payload }) => {
      this.handleLockUpdate(session, payload);
    });
    
    // Handle comments
    channel.on('broadcast', { event: 'comment' }, ({ payload }) => {
      this.handleCommentUpdate(session, payload);
    });
    
    // Subscribe to channel
    await channel.subscribe();
    
    return channel;
  }
  
  // Join collaborative session
  private async joinSession(session: CollaborativeSession): Promise<void> {
    const user = await this.getCurrentUser();
    const participant: Participant = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      color: this.generateUserColor(),
      status: 'active',
      lastActivity: new Date(),
      permissions: {
        canEdit: true,
        canComment: true,
        canDelete: false
      }
    };
    
    session.participants.push(participant);
    
    // Announce presence
    const channel = this.channels.get(session.documentId);
    if (channel) {
      await channel.track(participant);
    }
  }
  
  // Handle local text changes
  async handleLocalChange(
    documentId: string,
    change: Omit<DocumentChange, 'id' | 'timestamp' | 'version'>
  ): Promise<void> {
    const session = this.sessions.get(documentId);
    if (!session) throw new Error('Session not found');
    
    const fullChange: DocumentChange = {
      ...change,
      id: this.generateId(),
      timestamp: new Date(),
      version: session.version
    };
    
    // Check for conflicts
    const hasConflict = this.detectConflict(session, fullChange);
    if (hasConflict) {
      await this.resolveConflict(session, fullChange);
    }
    
    // Apply change locally
    this.applyChange(session, fullChange);
    
    // Broadcast to other participants
    const channel = this.channels.get(documentId);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'change',
        payload: fullChange
      });
    }
    
    // Add to buffer for batch saving
    if (!this.changeBuffer.has(documentId)) {
      this.changeBuffer.set(documentId, []);
    }
    this.changeBuffer.get(documentId)!.push(fullChange);
  }
  
  // Handle remote changes
  private handleRemoteChange(session: CollaborativeSession, change: DocumentChange): void {
    // Check if change is from current user
    if (change.userId === this.getCurrentUserId()) return;
    
    // Apply change with operational transformation
    this.applyChangeWithOT(session, change);
    
    // Update session
    session.changes.push(change);
    session.version = Math.max(session.version, change.version);
    session.updatedAt = new Date();
    
    // Emit event for UI update
    this.emitDocumentUpdate(session.documentId, change);
  }
  
  // Apply change with Operational Transformation
  private applyChangeWithOT(session: CollaborativeSession, change: DocumentChange): void {
    // Get current editor state
    const editorState = session.activeEditors.get(this.getCurrentUserId());
    if (!editorState) return;
    
    // Transform change based on local operations
    const transformedChange = this.transformChange(change, session.changes);
    
    // Apply transformed change
    this.applyChange(session, transformedChange);
  }
  
  // Transform change for operational transformation
  private transformChange(
    change: DocumentChange,
    localChanges: DocumentChange[]
  ): DocumentChange {
    let transformed = { ...change };
    
    for (const localChange of localChanges) {
      if (localChange.timestamp > change.timestamp) continue;
      
      // Adjust position based on local changes
      if (localChange.type === 'insert') {
        if (localChange.position <= transformed.position) {
          transformed.position += localChange.length || localChange.content?.length || 0;
        }
      } else if (localChange.type === 'delete') {
        if (localChange.position < transformed.position) {
          transformed.position -= localChange.length || 0;
        }
      }
    }
    
    return transformed;
  }
  
  // Apply change to document
  private applyChange(session: CollaborativeSession, change: DocumentChange): void {
    const editorState = session.activeEditors.get(change.userId) || 
                       session.activeEditors.get(this.getCurrentUserId());
    
    if (!editorState) return;
    
    let content = editorState.content;
    
    switch (change.type) {
      case 'insert':
        content = content.slice(0, change.position) + 
                 change.content + 
                 content.slice(change.position);
        break;
      
      case 'delete':
        content = content.slice(0, change.position) + 
                 content.slice(change.position + (change.length || 0));
        break;
      
      case 'replace':
        content = content.slice(0, change.position) + 
                 change.content + 
                 content.slice(change.position + (change.length || 0));
        break;
    }
    
    editorState.content = content;
    editorState.isDirty = true;
    
    session.changes.push(change);
  }
  
  // Detect conflicts
  private detectConflict(session: CollaborativeSession, change: DocumentChange): boolean {
    const recentChanges = session.changes.filter(c => 
      Math.abs(c.timestamp.getTime() - change.timestamp.getTime()) < this.conflictThreshold &&
      c.userId !== change.userId
    );
    
    for (const recent of recentChanges) {
      // Check for overlapping positions
      if (change.type === 'delete' || recent.type === 'delete') {
        const changeEnd = change.position + (change.length || 0);
        const recentEnd = recent.position + (recent.length || 0);
        
        if (
          (change.position >= recent.position && change.position < recentEnd) ||
          (recent.position >= change.position && recent.position < changeEnd)
        ) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  // Resolve conflicts
  private async resolveConflict(
    session: CollaborativeSession,
    change: DocumentChange
  ): Promise<void> {
    const conflictingChanges = session.changes.filter(c => 
      Math.abs(c.timestamp.getTime() - change.timestamp.getTime()) < this.conflictThreshold &&
      c.userId !== change.userId
    );
    
    const resolution: ConflictResolution = {
      strategy: 'merge',
      conflictingChanges,
      resolvedBy: change.userId,
      resolvedAt: new Date()
    };
    
    // Apply resolution strategy
    switch (resolution.strategy) {
      case 'merge':
        // Merge changes by adjusting positions
        const adjusted = this.transformChange(change, conflictingChanges);
        resolution.resolution = adjusted;
        break;
      
      case 'override':
        // Current change takes precedence
        resolution.resolution = change;
        break;
      
      case 'manual':
        // Require manual resolution
        await this.requestManualResolution(session, change, conflictingChanges);
        break;
    }
    
    log.info('Conflict resolved', { 
      documentId: session.documentId, 
      strategy: resolution.strategy 
    });
  }
  
  // Request manual conflict resolution
  private async requestManualResolution(
    session: CollaborativeSession,
    change: DocumentChange,
    conflicts: DocumentChange[]
  ): Promise<void> {
    // Notify user about conflict
    const channel = this.channels.get(session.documentId);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'conflict',
        payload: {
          change,
          conflicts,
          requiresResolution: true
        }
      });
    }
  }
  
  // Handle cursor updates
  private handleCursorUpdate(session: CollaborativeSession, payload: any): void {
    const participant = session.participants.find(p => p.id === payload.userId);
    if (participant) {
      participant.cursor = payload.cursor;
      participant.lastActivity = new Date();
      this.emitCursorUpdate(session.documentId, payload);
    }
  }
  
  // Handle selection updates
  private handleSelectionUpdate(session: CollaborativeSession, payload: any): void {
    const participant = session.participants.find(p => p.id === payload.userId);
    if (participant) {
      participant.selection = payload.selection;
      participant.lastActivity = new Date();
      this.emitSelectionUpdate(session.documentId, payload);
    }
  }
  
  // Handle lock updates
  private handleLockUpdate(session: CollaborativeSession, payload: any): void {
    if (payload.action === 'acquire') {
      session.locks.set(payload.lock.id, payload.lock);
    } else if (payload.action === 'release') {
      session.locks.delete(payload.lockId);
    }
    this.emitLockUpdate(session.documentId, payload);
  }
  
  // Handle comment updates
  private handleCommentUpdate(session: CollaborativeSession, payload: any): void {
    this.emitCommentUpdate(session.documentId, payload);
  }
  
  // Acquire edit lock
  async acquireLock(
    documentId: string,
    startIndex: number,
    endIndex: number,
    type: DocumentLock['type'] = 'edit'
  ): Promise<DocumentLock | null> {
    const session = this.sessions.get(documentId);
    if (!session) return null;
    
    // Check for conflicting locks
    for (const lock of session.locks.values()) {
      if (
        (startIndex >= lock.startIndex && startIndex < lock.endIndex) ||
        (endIndex > lock.startIndex && endIndex <= lock.endIndex)
      ) {
        // Lock conflict
        return null;
      }
    }
    
    const user = await this.getCurrentUser();
    const lock: DocumentLock = {
      id: this.generateId(),
      userId: user.id,
      userName: user.name,
      startIndex,
      endIndex,
      type,
      acquiredAt: new Date(),
      expiresAt: new Date(Date.now() + 30000) // 30 second lock
    };
    
    session.locks.set(lock.id, lock);
    
    // Broadcast lock
    const channel = this.channels.get(documentId);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'lock',
        payload: { action: 'acquire', lock }
      });
    }
    
    // Auto-release after expiry
    setTimeout(() => this.releaseLock(documentId, lock.id), 30000);
    
    return lock;
  }
  
  // Release lock
  async releaseLock(documentId: string, lockId: string): Promise<void> {
    const session = this.sessions.get(documentId);
    if (!session) return;
    
    session.locks.delete(lockId);
    
    // Broadcast lock release
    const channel = this.channels.get(documentId);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'lock',
        payload: { action: 'release', lockId }
      });
    }
  }
  
  // Add comment
  async addComment(
    documentId: string,
    comment: Omit<CollaborativeComment, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CollaborativeComment> {
    const fullComment: CollaborativeComment = {
      ...comment,
      id: this.generateId(),
      replies: [],
      reactions: new Map(),
      resolved: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Save to database
    const { data, error } = await supabase
      .from('collaborative_comments')
      .insert([fullComment])
      .select()
      .single();
    
    if (error) throw error;
    
    // Broadcast comment
    const channel = this.channels.get(documentId);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'comment',
        payload: { action: 'add', comment: data }
      });
    }
    
    return data;
  }
  
  // Start auto-save
  private startAutoSave(documentId: string): void {
    setInterval(async () => {
      await this.saveChanges(documentId);
    }, this.saveInterval);
  }
  
  // Save buffered changes
  private async saveChanges(documentId: string): Promise<void> {
    const changes = this.changeBuffer.get(documentId);
    if (!changes || changes.length === 0) return;
    
    try {
      // Batch save changes to database
      const { error } = await supabase
        .from('document_changes')
        .insert(changes);
      
      if (error) throw error;
      
      // Clear buffer
      this.changeBuffer.set(documentId, []);
      
      log.info('Changes saved', { documentId, count: changes.length });
    } catch (error) {
      log.error('Failed to save changes', error);
    }
  }
  
  // Update participants from presence state
  private updateParticipants(
    session: CollaborativeSession,
    state: RealtimePresenceState
  ): void {
    const participants: Participant[] = [];
    
    Object.values(state).forEach((presences: any[]) => {
      presences.forEach(presence => {
        participants.push(presence as Participant);
      });
    });
    
    session.participants = participants;
    this.emitParticipantsUpdate(session.documentId, participants);
  }
  
  // Leave session
  async leaveSession(documentId: string): Promise<void> {
    const session = this.sessions.get(documentId);
    if (!session) return;
    
    // Save any pending changes
    await this.saveChanges(documentId);
    
    // Release all locks
    const userId = this.getCurrentUserId();
    for (const [lockId, lock] of session.locks.entries()) {
      if (lock.userId === userId) {
        await this.releaseLock(documentId, lockId);
      }
    }
    
    // Unsubscribe from channel
    const channel = this.channels.get(documentId);
    if (channel) {
      await channel.unsubscribe();
      this.channels.delete(documentId);
    }
    
    // Remove session
    this.sessions.delete(documentId);
    
    log.info('Left collaborative session', { documentId });
  }
  
  // Get session info
  getSession(documentId: string): CollaborativeSession | null {
    return this.sessions.get(documentId) || null;
  }
  
  // Event emitters (would connect to UI)
  private emitDocumentUpdate(documentId: string, change: DocumentChange): void {
    window.dispatchEvent(new CustomEvent('collaborative:document:update', {
      detail: { documentId, change }
    }));
  }
  
  private emitCursorUpdate(documentId: string, cursor: any): void {
    window.dispatchEvent(new CustomEvent('collaborative:cursor:update', {
      detail: { documentId, cursor }
    }));
  }
  
  private emitSelectionUpdate(documentId: string, selection: any): void {
    window.dispatchEvent(new CustomEvent('collaborative:selection:update', {
      detail: { documentId, selection }
    }));
  }
  
  private emitLockUpdate(documentId: string, lock: any): void {
    window.dispatchEvent(new CustomEvent('collaborative:lock:update', {
      detail: { documentId, lock }
    }));
  }
  
  private emitCommentUpdate(documentId: string, comment: any): void {
    window.dispatchEvent(new CustomEvent('collaborative:comment:update', {
      detail: { documentId, comment }
    }));
  }
  
  private emitParticipantsUpdate(documentId: string, participants: Participant[]): void {
    window.dispatchEvent(new CustomEvent('collaborative:participants:update', {
      detail: { documentId, participants }
    }));
  }
  
  // Helper methods
  private generateId(): string {
    return `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private getCurrentUserId(): string {
    // Get from auth context
    return 'current_user_id';
  }
  
  private async getCurrentUser(): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    return {
      id: user?.id || 'anonymous',
      name: user?.email?.split('@')[0] || 'Anonymous',
      email: user?.email || '',
      avatar: user?.user_metadata?.avatar_url
    };
  }
  
  private generateUserColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FECA57', '#9C88FF', '#FD79A8', '#A29BFE'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

// Export singleton instance
export const collaborativeEditing = new CollaborativeEditingSystem();