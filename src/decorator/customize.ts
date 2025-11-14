import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

/** =======================
 *  Public Decorator
 *  ======================= */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** =======================
 *  Message Decorator
 *  ======================= */
export const RESPONSE_MESSAGE = 'response_message';
export const ResponseMessage = (message: string) =>
    SetMetadata(RESPONSE_MESSAGE, message);

/** =======================
 *  User Decorator
 *  ======================= */
export const User = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);

/** =======================
 *  Company Decorator (nếu bạn dùng)
 *  ======================= */
export const Company = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.company;
    },
);

/** =======================
 *  🟦 Role Decorator
 *  ======================= */
export const ROLES_KEY = 'roles';

/**
 * @Roles('admin')  → chỉ admin truy cập
 * @Roles('admin', 'staff') → nhiều role
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
