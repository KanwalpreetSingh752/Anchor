import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useProjectSocket(projectId, onEvent) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!projectId) return;

    const socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('subscribe:project', projectId);
    });

    socket.on('monitor:update', (data) => {
      onEvent?.('monitor:update', data);
    });

    socket.on('incident:new', (data) => {
      onEvent?.('incident:new', data);
    });

    socket.on('incident:resolved', (data) => {
      onEvent?.('incident:resolved', data);
    });

    return () => {
      socket.emit('unsubscribe:project', projectId);
      socket.disconnect();
    };
  }, [projectId]);

  return socketRef.current;
}
