import { Body,Controller,Get,Headers,Param,Post,Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from './prisma.service';
import { JoinRoomDto,NicknameDto } from './dto';
import { RoomsService } from './rooms.service';
import { GameEngine,toLocale } from './game.engine';
const GAME_FIELDS={id:true,title:true,tagline:true,description:true,duration:true,intensity:true,available:true} as const;
type GameRow={title:string;tagline:string;description:string;duration:string;translations?:{title:string;tagline:string;description:string;duration:string|null}[]};
const localizeGame=<T extends GameRow>({translations,...game}:T)=>({...game,...(translations?.[0]?{title:translations[0].title,tagline:translations[0].tagline,description:translations[0].description,duration:translations[0].duration??game.duration}:{})});
@Controller() export class ApiController{
 constructor(private db:PrismaService,private rooms:RoomsService,private engine:GameEngine){}
 @Get('health') health(){return {status:'ok',service:'after-dark-api',time:new Date().toISOString()}}
 @Get('games') async games(@Query('locale') locale?:string){const l=toLocale(locale);const rows=await this.db.game.findMany({select:{...GAME_FIELDS,...(l==='en'?{}:{translations:{where:{locale:l},select:{title:true,tagline:true,description:true,duration:true}}})},orderBy:{id:'asc'}});return rows.map(localizeGame)}
 @Get('games/:id') async game(@Param('id') id:string,@Query('locale') locale?:string){const l=toLocale(locale);return localizeGame(await this.db.game.findUniqueOrThrow({where:{id},select:{...GAME_FIELDS,...(l==='en'?{}:{translations:{where:{locale:l},select:{title:true,tagline:true,description:true,duration:true}}})}}))}
 @Throttle({default:{limit:8,ttl:60000}}) @Post('rooms') async create(@Body() body:NicknameDto){const r=await this.rooms.create(body.nickname);return {credentials:r.credentials,room:await this.engine.project(r.room.id,r.credentials.playerId)}}
 @Throttle({default:{limit:15,ttl:60000}}) @Post('rooms/join') async join(@Body() body:JoinRoomDto){const r=await this.rooms.join(body.code,body.nickname);return {credentials:r.credentials,room:await this.engine.project(r.room.id,r.credentials.playerId)}}
 @Get('rooms/:id') async room(@Param('id') id:string,@Headers('x-player-id') playerId:string,@Headers('x-reconnect-token') token:string,@Query('locale') locale?:string){await this.rooms.getAuthorized(id,playerId,token);return this.engine.project(id,playerId,toLocale(locale))}
}
