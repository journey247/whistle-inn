import jwt from 'jsonwebtoken';

export function verifyAdmin(request: Request) {
    const auth = request.headers.get('authorization');
    if (!auth) throw new Error('Unauthorized');
    const token = auth.replace('Bearer ', '');
    try {
        const decoded: any = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'dev-secret');
        return decoded;
    } catch (err) {
        throw new Error('Unauthorized');
    }
}
