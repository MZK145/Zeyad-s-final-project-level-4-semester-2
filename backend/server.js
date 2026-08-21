require('dotenv').config();
const http=require('http');
const mongoose=require('mongoose');
const app=require('./app');
const {socketHandler}=require('./sockets/socketHandler');

const port=Number(process.env.PORT)||5000;
const mongoUrl=process.env.MONGO_URI||process.env.MONGODB_URI;

async function start(){
  if(!mongoUrl)throw new Error('MONGO_URI is required');
  if(!String(process.env.JWT_SECRET||'').trim()||process.env.JWT_SECRET==='change-this-secret')throw new Error('JWT_SECRET must be configured');
  await mongoose.connect(mongoUrl);
  const server=http.createServer(app);
  const io=require('socket.io')(server,{cors:{origin:true,credentials:true}});
  app.locals.io=io;
  socketHandler(io);
  server.listen(port,()=>console.log(`MetroFlow API listening on ${port}`));
}
start().catch(error=>{console.error(error);process.exit(1);});
