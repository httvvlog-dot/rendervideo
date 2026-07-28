export function generateCorrelationId(prefix: string = 'req'): string {
  // Use crypto.randomUUID() which is standard in Node.js and modern browsers
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 10);
  const shortId = uuid.split('-')[0].toUpperCase();
  return `${prefix}_${shortId}`;
}

export const Logger = {
  info: (msg: string, correlationId?: string, data?: any) => {
    console.log(`[INFO]${correlationId ? ` [${correlationId}]` : ''} ${msg}`, data || '');
  },
  warn: (msg: string, correlationId?: string, data?: any) => {
    console.warn(`[WARN]${correlationId ? ` [${correlationId}]` : ''} ${msg}`, data || '');
  },
  error: (msg: string, correlationId?: string, error?: any) => {
    console.error(`[ERROR]${correlationId ? ` [${correlationId}]` : ''} ${msg}`, error || '');
  }
};
