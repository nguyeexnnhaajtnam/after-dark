import Image from 'next/image';
import type {CardCategory} from '@after-dark/contracts';

/**
 * Box sizes per surface. The PNGs in public/images/card-type are the approved art from images/02_7_card_type_icons_transparent_v2
 * (đọc vị, tương tác, mong muốn chung, bẻ lái, mèo nằm vùng, quyền năng, phạt vui), cropped to their solid content and
 * re-centred on one transparent 192px canvas at a shared optical size (√(w·h) ≈ 150px, long side ≤ 184px), so the visible
 * mark is ~80% of the box (tray ≈24px, header ≈32px, tutorial ≈42px, event ≈58px).
 */
const BOX={tray:30,list:36,header:40,tutorial:52,event:72} as const;
export type EmblemSize=keyof typeof BOX;

/** The card-type art printed straight on the surface: no disc, frame or shadow. Decorative; the category is always named in text nearby. */
export function TypeEmblem({type,size,className=''}:{type:CardCategory;size:EmblemSize;className?:string}){
 const px=BOX[size];
 return <Image src={`/images/card-type/${type.toLowerCase().replace(/_/g,'-')}.png`} alt="" aria-hidden width={px} height={px} draggable={false} className={`type-emblem ${className}`} style={{width:px,height:px}}/>;
}
