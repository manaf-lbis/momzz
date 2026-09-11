import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response.handler';

export interface RequestValidationSchemas {
  body?: ZodSchema<any>;
  query?: ZodSchema<any>;
  params?: ZodSchema<any>;
}

export const validateRequest = (schemas: RequestValidationSchemas) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        const issues = (error as any).issues || (error as any).errors || [];
        const errorMessages = issues.map((err: any) => `${err.path?.join('.') || 'field'}: ${err.message}`).join(', ');
        return sendError(res, `Validation error: ${errorMessages}`, 400, issues);
      }
      return sendError(res, 'Invalid request parameters.', 400);
    }

  };
};
