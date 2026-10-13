import { ConflictException,ForbiddenException,GoneException,Injectable,NotFoundException } from '@nestjs/common';
import { createHash,randomBytes,randomInt } from 'crypto';
import { PrismaService } from './prisma.service';
@Injectable() export class RoomsService {
 constructor(private db:PrismaService){}
 private code(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({length:6},()=>alphabet[randomInt(alphabet.length)]).join('')}
 private token(){return randomBytes(32).toString('base64url')}
 private hash(token:string){return createHash('sha256').update(token+(process.env.RECONNECT_TOKEN_PEPPER||'dev-only-pepper')).digest('hex')}
 async create(nickname:string){for(let i=0;i<8;i++){const token=this.token();try{const room=await this.db.room.create({data:{code:this.code(),expiresAt:new Date(Date.now()+Number(process.env.ROOM_TTL_HOURS||12)*3600000),players:{create:{nickname:nickname.trim(),isHost:true,tokenHash:this.hash(token)}}},include:{players:true}});return {room,credentials:{roomId:room.id,playerId:room.players[0].id,token,code:room.code}}}catch(e:any){if(e?.code!=='P2002')throw e}}throw new ConflictException('Could not allocate a room code')}
 async join(code:string,nickname:string){return this.db.$transaction(async tx=>{const room=await tx.room.findUnique({where:{code:code.toUpperCase()},include:{players:true}});if(!room)throw new NotFoundException('Room code not found');if(room.expiresAt<new Date()||room.status==='EXPIRED')throw new GoneException('Room has expired');if(room.players.length>=2)throw new ConflictException('Room is full');const token=this.token();const player=await tx.roomPlayer.create({data:{roomId:room.id,nickname:nickname.trim(),tokenHash:this.hash(token)}});return {room:{...room,players:[...room.players,player]},credentials:{roomId:room.id,playerId:player.id,token,code:room.code}}})}
 async authorize(roomId:string,playerId:string,token:string){const player=await this.db.roomPlayer.findFirst({where:{id:playerId,roomId}});if(!player||player.tokenHash!==this.hash(token))throw new ForbiddenException('Invalid reconnect credentials');const room=await this.db.room.findUnique({where:{id:roomId},include:{players:true}});if(!room)throw new NotFoundException('Room not found');if(room.expiresAt<new Date())throw new GoneException('Room has expired');return {room,player}}
 async getAuthorized(roomId:string,playerId:string,token:string){return this.authorize(roomId,playerId,token)}
}
