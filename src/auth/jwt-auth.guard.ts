import {
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from 'src/decorator/customize';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;
        return super.canActivate(context);
    }

    handleRequest(err, user, info, context: ExecutionContext) {
        const request: Request = context.switchToHttp().getRequest();

        if (err || !user) {
            throw err || new UnauthorizedException(
                'Token không hợp lệ hoặc không có Bearer Token',
            );
        }

        // ===== Chuẩn hoá method + path hiện tại =====
        const targetMethod = request.method;

        // lấy path thực tế không có query
        const rawPath =
            (request.baseUrl || '') + (request.route?.path || '');
        // /api/v1/permissions/:id khi khai báo controller sẽ là "/:id"
        // nếu controller khai báo "/api/v1/permissions/:id" thì rawPath đã chuẩn
        // thay id hex 24 ký tự thành :id để khớp mọi bản ghi
        let targetPath = rawPath.replace(/\/[a-fA-F0-9]{24}$/, '/:id');

        // chấp nhận so khớp có/không có prefix /api/v1
        const normalize = (p: string) =>
            p.replace(/\?.*$/, '').replace(/^\/api\/v1/, '');

        const normTarget = normalize(targetPath);

        // ===== Lấy danh sách permission từ role =====
        const role = user?.role;
        const permissions: any[] =
            role?.permissions && Array.isArray(role.permissions)
                ? role.permissions
                : [];

        // Bypass cho ADMIN nếu bạn muốn
        if (role?.name === 'ADMIN') return user;

        // Bypass các endpoint auth nếu cần
        if (normTarget.startsWith('/auth')) return user;

        // ===== So khớp quyền =====
        const ok = permissions.some((p) => {
            const pMethod = p.method;
            const pPath = normalize(p.apiPath || '');
            return pMethod === targetMethod && pPath === normTarget;
        });

        if (!ok) {
            throw new ForbiddenException('Bạn không có quyền truy cập endpoint này');
        }

        return user;
    }
}
