import {RoomScreen} from '@/components/room-screen';export default async function Room({params}:{params:Promise<{id:string}>}){const {id}=await params;return <RoomScreen roomId={id}/>}
