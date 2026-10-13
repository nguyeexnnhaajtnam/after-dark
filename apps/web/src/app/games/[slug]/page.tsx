import {notFound} from 'next/navigation';
import {GameDetail} from '@/components/game-detail';
import {findGame,games} from '@/lib/games';

export function generateStaticParams(){return games.map(game=>({slug:game.id}))}

export default async function Detail({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const game=findGame(slug);
 if(!game)notFound();
 return <GameDetail slug={game.id}/>;
}
