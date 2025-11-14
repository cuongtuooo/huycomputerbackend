import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'src/decorator/customize';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // Nếu API không yêu cầu role → cho phép vào
        if (!requiredRoles || requiredRoles.length === 0) return true;

        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user || !user.role?.name) {
            throw new ForbiddenException('Không xác định được quyền.');
        }

        const userRole = user.role.name.toLowerCase();

        // So khớp quyền
        const ok = requiredRoles.some((role) => role.toLowerCase() === userRole);
        if (!ok) throw new ForbiddenException('Bạn không có quyền truy cập API này.');

        return true;
    }
}
