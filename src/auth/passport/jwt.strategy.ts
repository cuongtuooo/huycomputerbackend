import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IUser } from 'src/users/users.interface';
import { RolesService } from 'src/roles/roles.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private rolesService: RolesService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
        });
    }

    // ✅ Luôn trả về role đã có permissions (populate)
    async validate(payload: IUser) {
        const { _id, name, email, role, permissions } = payload;

        // role trong token có thể là object {_id, name} hoặc chỉ _id
        const roleId = (role as any)?._id ?? (role as any);

        // đảm bảo RolesService.findOne() populate('permissions')
        const fullRole = await this.rolesService.findOne(roleId);

        return {
            _id,
            name,
            email,
            role: fullRole, // ← role có permissions
            permissions,
        };
    }
}
