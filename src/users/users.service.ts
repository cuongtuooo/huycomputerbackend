import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto, RegisterUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User as UserM, UserDocument } from './schemas/user.schema';
import mongoose, { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { genSaltSync, hashSync, compareSync } from "bcryptjs";
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IUser } from './users.interface';
import aqp from 'api-query-params';
import { Role, RoleDocument } from 'src/roles/schemas/role.schema';
import { ChangePasswordDto } from './dto/change-password.dto';
import { randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';
import dayjs from 'dayjs';



@Injectable()
export class UsersService {
  constructor(
    @InjectModel(UserM.name) 
    private userModel: SoftDeleteModel<UserDocument>,

    @InjectModel(Role.name)
    private roleModel: SoftDeleteModel<RoleDocument>
  ) { }

  getHashPassword = (password: string )=>{
    const salt =genSaltSync(10);
    const hash =hashSync(password, salt);
    return hash;
  }

  // cách tạo user lúc mới học 
  // async create(createUserDto: CreateUserDto) {
  //   const hassPassword = this.getHashPassword(createUserDto.password);

  //   let user = await this.userModel.create({
  //     email:createUserDto.email,
  //     password:hassPassword,
  //     name: createUserDto.name,
  //     address: createUserDto.address
  //   })
  //   return user;
  // }

  async create(createUserDto: CreateUserDto, user: IUser) {
    const { email, name, password, phone, role } = createUserDto;

    const isExist = await this.userModel.findOne({ email });
    if (isExist) throw new BadRequestException(`email:${email} đã tồn tại`);

    const hassPassword = this.getHashPassword(password);

    // Kiểm tra role có tồn tại
    const checkRole = await this.roleModel.findById(role);
    if (!checkRole) throw new BadRequestException("Role không tồn tại");

    const newUser = await this.userModel.create({
      name,
      email,
      password: hassPassword,
      phone,
      role: new mongoose.Types.ObjectId(role),
      createdBy: {
        _id: user._id,
        email: user.email
      }
    });

    return newUser;
  }


  async register(user: RegisterUserDto) {
    const { email, name,password } = user
    // logic checkmail
    const isExist = await this.userModel.findOne({email});

    if (isExist) {
      throw new BadRequestException(`email:${email} đã tồn tại`)
    }

    //fetch user role
    const userRole = await this.roleModel.findOne({ name: "NORMAL_USER" })


    const hassPassword = this.getHashPassword(password);
    let newRegister = await this.userModel.create({
      name,
      email,
      password:hassPassword,
      role: userRole?._id
    })
    return newRegister;
  }


  async findAll(currentPage: number, limit: number, qs: string) {
    const { filter, sort, projection, population } = aqp(qs);

    // xóa page và limit ra khỏi filter
    delete filter.current;
    delete filter.pageSize;

    // check filter
    // return {filter}


    let offset = (+currentPage - 1) * (+limit);
    let defaultLimit = +limit ? +limit : 10;

    const totalItems = (await this.userModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.userModel.find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
      .select('-password')
      .populate({ path: 'role', select: '_id name' })   // ⬅ THÊM DÒNG NÀY
      .populate(population)
      .exec();


    return {
      meta: {
        current: currentPage, //trang hiện tại
        pageSize: limit, //số lượng bản ghi đã lấy
        pages: totalPages,  //tổng số trang với điều kiện query
        total: totalItems // tổng số phần tử (số bản ghi)
      },
      result //kết quả query
    }
  }

  findOne(id: string) {
    if(!mongoose.Types.ObjectId.isValid(id))
      return "không tìm thấy user"

    return this.userModel.findOne({
      _id:id
    }).select("-password") //exclude >< include tức là không muốn lấy password
      .populate({ path: "role", select: "_id name" });
   }

  findOneByUserName(username: string) {
    return this.userModel.findOne({
      email: username
    }).populate({ path: "role", select: { name: 1 } })
  }

  isValidPassWord(password: string, hash: string) {
    return compareSync(password, hash);
  }

  async update(updateUserDto: UpdateUserDto, user: IUser) {
    const updated = await this.userModel.updateOne(
      { _id: updateUserDto._id },
      {
        ...updateUserDto,
        updatedBy: {
          _id: user._id,
          email: user.email
        }
      }
    );
    return updated;
  }


  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id))
    return "không tìm thấy user"
    
    const foundUser = await this.userModel.findById(id);
    if (foundUser && foundUser.email === "admin@gmail.com") {
      throw new BadRequestException("Không thể xóa tài khoản admin@gmail.com")
    }

    await this.userModel.updateOne(
      { _id: id },
      {
      deletedBy: {
        _id: user._id,
        email: user.email
      }, })

    return this.userModel.softDelete({
      _id: id
    })
  }

  updateUserToken = async (refreshToken: string, _id: string)=>{
    return await this.userModel.updateOne(
      {_id},
      { refreshToken }
    )
  }

  findUserByToken = async (refreshToken: string) => {
    return await this.userModel.findOne({refreshToken})
    .populate({
      path:"role",
      select: {name:1}
    })
  }

  async changePasswordByEmail(dto: ChangePasswordDto) {
    const { email, oldpass, newpass } = dto;

    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new BadRequestException(`Không tìm thấy người dùng với email: ${email}`);
    }

    const isMatch = this.isValidPassWord(oldpass, user.password);
    if (!isMatch) {
      throw new BadRequestException('Mật khẩu cũ không đúng');
    }

    const hashed = this.getHashPassword(newpass);
    await this.userModel.updateOne({ email }, { password: hashed });

    return {
      message: 'Đổi mật khẩu thành công'
    };
  }


  /** 🟢 Gửi email quên mật khẩu */
  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new BadRequestException('Không tìm thấy người dùng');

    const token = randomBytes(20).toString('hex');
    const expires = dayjs().add(15, 'minute').toDate();

    await this.userModel.updateOne({ email }, {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    });

    // 📨 Gửi email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: `"Huy Computer" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Khôi phục mật khẩu',
      html: `
      <p>Xin chào ${user.name},</p>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu.</p>
      <p>Nhấn vào liên kết sau để tạo mật khẩu mới (hiệu lực 15 phút):</p>
      <a href="${resetLink}">${resetLink}</a>
    `,
    });

    return { message: 'Đã gửi email khôi phục mật khẩu' };
  }

  /** 🟠 Đặt lại mật khẩu bằng token */
  async resetPassword(token: string, newPassword: string) {
    const user = await this.userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');

    const hashed = this.getHashPassword(newPassword);

    await this.userModel.updateOne(
      { _id: user._id },
      {
        password: hashed,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    );

    return { message: 'Đặt lại mật khẩu thành công' };
  }

}
