module.exports=(error,_req,res,_next)=>{
  console.error(error);
  if(error?.code===11000)return res.status(409).json({error:'A duplicate record already exists'});
  if(error?.name==='ValidationError')return res.status(400).json({error:Object.values(error.errors).map(e=>e.message).join(', ')});
  if(error?.name==='CastError')return res.status(400).json({error:'Invalid resource id'});
  const status=Number(error?.statusCode)||500;
  res.status(status).json({error:status>=500?'Server error':(error?.message||'Request failed')});
};
