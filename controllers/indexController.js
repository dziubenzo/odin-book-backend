import asyncHandler from 'express-async-handler';
// Copy to controllers with POST/PUT routes
import { body, validationResult } from 'express-validator';

export const index = asyncHandler(async (req, res, next) => {
  return res.json({
    project: 'Odin-Book',
    author: 'dziubenzo',
  });
});
