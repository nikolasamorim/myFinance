import serverless from 'serverless-http';
import app from '../../apps/api/src/app';

export const handler = serverless(app);
