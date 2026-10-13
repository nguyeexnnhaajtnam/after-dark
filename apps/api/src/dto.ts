import { IsIn,IsString,Length,Matches,MaxLength,MinLength } from 'class-validator';
export class NicknameDto {@IsString() @MinLength(1) @MaxLength(24) nickname!:string}
export class JoinRoomDto extends NicknameDto {@IsString() @Length(6,6) @Matches(/^[A-Z0-9]+$/) code!:string}
