
import { useContext } from 'react';
import { RequestContext } from '../context/RequestContext';

export const useRequests = () => {
  const context = useContext(RequestContext);
  if (context === undefined) {
    throw new Error('useRequests must be used within a RequestProvider');
  }
  return context;
};