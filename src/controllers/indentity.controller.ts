import { Request, Response } from 'express';

export const identifyContact = async (req: Request, res: Response) => {
    const payload: any = req.body;
    res.status(200).json(payload);
};