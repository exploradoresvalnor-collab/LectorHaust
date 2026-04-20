/**
 * ChronoSync Components - Real-time reading experience
 */

import React, { useState } from 'react';
import { useChronoSync } from '../hooks/useChronoSync';
import './chronosync.css';

interface ReaderGroupCardProps {
  group: any;
  onJoin?: () => void;
  onLeave?: () => void;
  isJoined?: boolean;
}

export const ReaderGroupCard: React.FC<ReaderGroupCardProps> = ({
  group,
  onJoin,
  onLeave,
  isJoined = false
}) => {
  return (
    <div className="reader-group-card">
      <div className="group-header">
        <h3>{group.mangaTitle}</h3>
        <span className="chapter-tag">Cap. {group.chapterNumber}</span>
      </div>

      <div className="group-stats">
        <div className="stat">
          <span className="stat-label">Lectores activos</span>
          <span className="stat-value">{group.totalReaders}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Velocidad promedio</span>
          <span className="stat-value">{group.averageReadingSpeed.toFixed(1)} pág/min</span>
        </div>
      </div>

      <div className="leaderboard-mini">
        <h4>Ranking</h4>
        <ul>
          {group.leaderboard.slice(0, 3).map((entry: any, idx: number) => (
            <li key={idx}>
              <span className="rank">#{entry.rank}</span>
              <span className="name">{entry.userName}</span>
              <span className="progress">{entry.currentPage} pág</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        className={`group-action ${isJoined ? 'joined' : 'join'}`}
        onClick={isJoined ? onLeave : onJoin}
      >
        {isJoined ? '✓ En el grupo' : 'Unirse'}
      </button>
    </div>
  );
};

interface ReaderLeaderboardProps {
  leaderboard: any[];
  maxDisplay?: number;
}

export const ReaderLeaderboard: React.FC<ReaderLeaderboardProps> = ({
  leaderboard,
  maxDisplay = 5
}) => {
  return (
    <div className="reader-leaderboard">
      <h3>🏆 Ranking en Vivo</h3>
      <div className="leaderboard-list">
        {leaderboard.slice(0, maxDisplay).map((entry, idx) => (
          <div key={idx} className="leaderboard-entry">
            <div className="rank-badge">
              {idx === 0 && '🥇'}
              {idx === 1 && '🥈'}
              {idx === 2 && '🥉'}
              {idx > 2 && idx + 1}
            </div>
            <div className="entry-info">
              <span className="entry-name">{entry.userName}</span>
              <span className="entry-speed">{entry.readingSpeed.toFixed(1)} pág/min</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min((entry.currentPage / 100) * 100, 100)}%`
                }}
              />
            </div>
            <span className="page-count">{entry.currentPage} pág</span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface GroupChatProps {
  messages: any[];
  onSendMessage?: (msg: string, spoiler: boolean) => void;
}

export const GroupChat: React.FC<GroupChatProps> = ({ messages, onSendMessage }) => {
  const [input, setInput] = useState('');
  const [spoilerMode, setSpoilerMode] = useState(false);

  const handleSend = () => {
    if (input.trim() && onSendMessage) {
      onSendMessage(input, spoilerMode);
      setInput('');
      setSpoilerMode(false);
    }
  };

  return (
    <div className="group-chat">
      <h3>💬 Chat del Grupo</h3>
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`chat-message ${msg.isSpoiler ? 'spoiler' : ''}`}
          >
            <span className="sender">{msg.userName}</span>
            {msg.isSpoiler && <span className="spoiler-tag">⚠️ SPOILER</span>}
            <p className="message-text">{msg.message}</p>
            <time className="timestamp">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </time>
          </div>
        ))}
      </div>

      <div className="chat-input">
        <input
          type="text"
          placeholder="Escribe un mensaje..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          className={`spoiler-toggle ${spoilerMode ? 'active' : ''}`}
          onClick={() => setSpoilerMode(!spoilerMode)}
          title="Marcar como spoiler"
        >
          ⚠️
        </button>
        <button onClick={handleSend} className="send-btn">
          Enviar
        </button>
      </div>
    </div>
  );
};

interface ReadingRaceCardProps {
  race: any;
  onJoin?: () => void;
  isJoined?: boolean;
}

export const ReadingRaceCard: React.FC<ReadingRaceCardProps> = ({
  race,
  onJoin,
  isJoined = false
}) => {
  const timeLeft = race.rules.maxDuration - Math.floor((Date.now() - race.startTime) / 60000);

  return (
    <div className={`reading-race-card ${race.status}`}>
      <div className="race-header">
        <h3>🏁 {race.title}</h3>
        <span className={`status-badge ${race.status}`}>{race.status.toUpperCase()}</span>
      </div>

      <div className="race-info">
        <div className="info-row">
          <span>Participantes:</span>
          <strong>{race.participants.length}</strong>
        </div>
        <div className="info-row">
          <span>Tiempo restante:</span>
          <strong>{Math.max(0, timeLeft)} min</strong>
        </div>
      </div>

      <div className="race-participants">
        <h4>Participantes</h4>
        {race.participants.slice(0, 5).map((p: any, idx: number) => (
          <div key={idx} className="participant">
            <span className="name">{p.userName}</span>
            <span className="pages">{p.pagesRead} pág</span>
          </div>
        ))}
      </div>

      <button
        className={`race-action ${isJoined ? 'joined' : 'join'}`}
        onClick={onJoin}
        disabled={race.status === 'completed'}
      >
        {isJoined ? '✓ Participando' : 'Participar'}
      </button>
    </div>
  );
};

interface ChronoSyncDashboardProps {
  userId: string;
  userName: string;
}

export const ChronoSyncDashboard: React.FC<ChronoSyncDashboardProps> = ({
  userId,
  userName
}) => {
  const {
    stats,
    availableGroups,
    joinedGroup,
    joinedRaces,
    groupLeaderboard,
    joinGroup,
    leaveGroup,
    sendChatMessage,
    createRace,
    joinRace
  } = useChronoSync();

  return (
    <div className="chronosync-dashboard">
      <header className="dashboard-header">
        <h2>⚡ ChronoSync - Lectura en Tiempo Real</h2>
        <div className="live-stats">
          <div className="stat">
            <span className="label">Lectores activos</span>
            <span className="value">{stats.activeReaders}</span>
          </div>
          <div className="stat">
            <span className="label">Grupos activos</span>
            <span className="value">{stats.activeGroups}</span>
          </div>
          <div className="stat">
            <span className="label">Carreras</span>
            <span className="value">{stats.activeRaces}</span>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        {joinedGroup && (
          <section className="active-group">
            <div className="section-header">
              <h3>Mi Grupo</h3>
              <button onClick={leaveGroup} className="leave-btn">
                Salir del grupo
              </button>
            </div>

            <div className="group-content">
              <ReaderLeaderboard leaderboard={groupLeaderboard} />
              <GroupChat
                messages={joinedGroup.chatMessages || []}
                onSendMessage={sendChatMessage}
              />
            </div>
          </section>
        )}

        <section className="available-groups">
          <h3>Grupos Disponibles</h3>
          <div className="groups-grid">
            {availableGroups.map((group) => (
              <ReaderGroupCard
                key={group.groupId}
                group={group}
                isJoined={joinedGroup?.groupId === group.groupId}
                onJoin={() => joinGroup(group.groupId)}
                onLeave={leaveGroup}
              />
            ))}
          </div>
        </section>

        <section className="active-races">
          <h3>🏁 Carreras de Lectura</h3>
          <div className="races-grid">
            {joinedRaces.map((race) => (
              <ReadingRaceCard
                key={race.raceId}
                race={race}
                isJoined={true}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ChronoSyncDashboard;
