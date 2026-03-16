import React, { useState, useEffect } from 'react';
import {
  IonList,
  IonItem,
  IonAvatar,
  IonLabel,
  IonText,
  IonInput,
  IonButton,
  IonIcon,
  IonSpinner,
  IonNote
} from '@ionic/react';
import { sendOutline, personCircleOutline, trashOutline } from 'ionicons/icons';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp,
  deleteDoc,
  doc 
} from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import './CommentSection.css';

interface Comment {
  id: string;
  mangaId: string;
  chapterId?: string | null;
  userId: string;
  userName: string;
  userAvatar: string | null;
  text: string;
  createdAt: any;
}

interface CommentSectionProps {
  mangaId: string;
  chapterId?: string | null;
  title?: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ mangaId, chapterId, title = "El Muro Haus" }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const currentUser = auth.currentUser;

  useEffect(() => {
    setLoading(true);
    // Query comments for this manga (and chapter if provided)
    const baseQuery = query(
      collection(db, 'comments'),
      where('mangaId', '==', mangaId),
      where('chapterId', '==', chapterId || null),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(baseQuery, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(fetchedComments);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching comments:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [mangaId, chapterId]);

  const handleSendComment = async () => {
    if (!newComment.trim() || !currentUser || sending) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'comments'), {
        mangaId,
        chapterId: chapterId || null,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Lector Haus',
        userAvatar: currentUser.photoURL || null,
        text: newComment.trim(),
        createdAt: Timestamp.now()
      });
      setNewComment('');
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="comment-section-container">
      <div className="comment-header">
        <h3>{title} <span className="comment-count">({comments.length})</span></h3>
      </div>

      {currentUser ? (
        <div className="comment-input-wrapper glass-input">
          <IonInput
            placeholder="Escribe algo épico..."
            value={newComment}
            onIonChange={e => setNewComment(e.detail.value!)}
            onKeyUp={e => e.key === 'Enter' && handleSendComment()}
          />
          <IonButton fill="clear" onClick={handleSendComment} disabled={!newComment.trim() || sending}>
            {sending ? <IonSpinner name="crescent" /> : <IonIcon icon={sendOutline} />}
          </IonButton>
        </div>
      ) : (
        <div className="login-prompt-comment">
          <p>Inicia sesión para dejar tu huella en El Muro Haus 🚀</p>
        </div>
      )}

      {loading ? (
        <div className="comment-loading">
          <IonSpinner name="dots" color="primary" />
        </div>
      ) : comments.length > 0 ? (
        <IonList className="comment-list no-bg">
          {comments.map((comment) => (
            <IonItem key={comment.id} lines="none" className="comment-item animate-pop-in">
              <IonAvatar slot="start" className="comment-avatar">
                {comment.userAvatar ? (
                  <img src={comment.userAvatar} alt="user" />
                ) : (
                  <div className="mascot-avatar-small">
                    <img src="/mascot.png" alt="pro" />
                  </div>
                )}
              </IonAvatar>
              <IonLabel className="comment-content">
                <div className="comment-user-row">
                  <span className="comment-user-name">{comment.userName}</span>
                  <IonNote className="comment-date">{formatTime(comment.createdAt)}</IonNote>
                </div>
                <IonText className="comment-text-body">
                  <p>{comment.text}</p>
                </IonText>
              </IonLabel>
              {currentUser?.uid === comment.userId && (
                <IonButton slot="end" fill="clear" color="danger" onClick={() => handleDeleteComment(comment.id)}>
                  <IonIcon icon={trashOutline} />
                </IonButton>
              )}
            </IonItem>
          ))}
        </IonList>
      ) : (
        <div className="empty-comments">
          <p>Nadie ha dicho nada todavía... ¡Sé el primero! 🖋️</p>
        </div>
      )}
    </div>
  );
};

export default CommentSection;
