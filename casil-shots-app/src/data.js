export const categories = ['All','Portraits','Couples','Weddings','Celebrations','Events','Motorcycle Photography','Commercial Photography']
const pics = [
 ['Portraits','Quiet Confidence','photo-1534528741775-53994a69daeb'],['Couples','Golden Hour Together','photo-1511285560929-80b456fea0bc'],['Weddings','A Day to Remember','photo-1519741497674-611481863552'],['Celebrations','The Afterglow','photo-1530103862676-de8c9debad1d'],['Events','In the Moment','photo-1492684223066-81342ee5ff30'],['Motorcycle Photography','Built to Roam','photo-1558981806-ec527fa84c39'],['Commercial Photography','Form & Function','photo-1523275335684-37898b6baf30'],['Portraits','Soft Focus','photo-1500648767791-00dcc994a43e'],['Couples','The Way You Look','photo-1529636798458-92182e662485'],['Events','After Dark','photo-1516450360452-9312f5e86fc7'],['Weddings','Forever Begins','photo-1465495976277-4387d4b0e4a6'],['Motorcycle Photography','Open Road','photo-1568772585407-9361f9bf3a87']
]
export const photos = pics.map(([category,title,id], i) => ({ id:`shot-${i+1}`, category, title, project:i<6?['The Portrait Edit','Golden Hour Stories','Forever, Framed','Little Moments','Live & Loud','Built to Roam'][i]:null, image:`https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=85`, alt:title }))
export const projects = [
 {id:'portrait-edit',title:'The Portrait Edit',category:'Portraits',description:'A study in natural light, honest expressions and the details that make a portrait feel like you.',cover:photos[0].image,visibility:'Public'},
 {id:'golden-hour',title:'Golden Hour Stories',category:'Couples',description:'Unscripted frames for two people choosing each other, in warm evening light.',cover:photos[1].image,visibility:'Public'},
 {id:'forever-framed',title:'Forever, Framed',category:'Weddings',description:'A heartfelt record of a celebration and all the in-between moments.',cover:photos[2].image,visibility:'Public'},
 {id:'client-album',title:'The Celebration Album',category:'Events',description:'Private demo album for the client gallery preview.',cover:photos[3].image,visibility:'Private'},
 {id:'unlisted',title:'Studio Stories',category:'Commercial Photography',description:'Unlisted project demo.',cover:photos[6].image,visibility:'Unlisted'}
]
export const media = Array.from({length:6},(_,i)=>({id:`film-${i+1}`,title:['Between the Frames','A Day in Gold','The Celebration Edit','Two of Us','Built to Roam','Behind the Lens'][i],category:['Behind the Scenes','Couples','Events','Weddings','Motorcycle','Studio'][i],duration:['00:42','01:18','00:56','01:32','00:48','01:05'][i],description:'A short visual story from the Casil Shots archive.',thumbnail:photos[[0,1,3,2,5,6][i]].image,featured:true,video:''}))
export const services = [
 {name:'Portrait Session',price:'PHP 3,500',description:'A relaxed portrait session built around your personality.',items:['60-minute session','One location','15 edited photos']},
 {name:'Couples Session',price:'PHP 5,500',description:'Keep the little moments and the big feelings.',items:['90-minute session','Two locations nearby','25 edited photos']},
 {name:'Event Photography',price:'PHP 8,000',description:'Thoughtful coverage for gatherings worth remembering.',items:['Up to 3 hours','Edited highlight gallery','Online delivery']},
 {name:'Motorcycle Photography',price:'PHP 4,000',description:'A cinematic portrait of you and your ride.',items:['60-minute session','One location','18 edited photos']},
 {name:'Commercial Photography',price:'PHP 7,500',description:'Clean, considered imagery for products and small brands.',items:['Creative planning','One half-day shoot','Usage discussed per project']}
]
export const packages = [
 {name:'Basic',price:'PHP 3,000',coverage:'2 hours coverage',description:'A simple, thoughtful record of your occasion.',items:['Unlimited shots','Edited photos','Online delivery','1 photographer']},
 {name:'Silver',price:'PHP 4,000',coverage:'3 to 4 hours coverage',description:'More time to capture the people and moments around your event.',items:['Unlimited shots','Edited photos','Online delivery','1 photographer']},
 {name:'Gold',price:'PHP 6,000',coverage:'5 to 6 hours coverage',description:'Extended event coverage with a second photographer.',items:['Unlimited shots','Edited photos','Online delivery','2 photographers'],popular:true}
]
export const highlightVideo = {name:'Highlight Video',price:'PHP 2,500',duration:'3-minute highlight video',items:['Creative video shots','Edited output','HD video quality','Social media sharing']}
export const testimonials = [{name:'Sample Client  |  Portraits',quote:'"The photos felt like me, only on my very best day."'},{name:'Sample Client  |  Couples',quote:'"We forgot the camera was there. That is exactly what we hoped for."'},{name:'Sample Client  |  Events',quote:'"Every little moment we missed was waiting for us in the gallery."'}]
export const albums = [{id:'client-album',name:'The Celebration Album',photos:photos.slice(3,7)}]
