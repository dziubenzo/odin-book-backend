import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';

export const index = asyncHandler(async (req: Request, res: Response) => {
  res.json({
    project: 'Aurora',
    author: 'dziubenzo',
  });
});
