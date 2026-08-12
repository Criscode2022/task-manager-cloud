import { handleApiRequest } from '../../server/http-handler.mjs';

export default async (req) => handleApiRequest(req);

export const config = {
  path: '/api/*',
};
