const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
prisma.mark.findMany({ 
  include: { student: { include: { class: true } } } 
}).then(marks => { 
  console.log('Total marks:', marks.length); 
  if(marks.length > 0) { 
    console.log('Sample mark:', marks[0]); 
  } 
}).catch(console.error).finally(() => prisma.$disconnect());
