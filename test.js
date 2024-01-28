import bcrypt from "bcrypt";

let hash;

(
    async ()=>{
            hash=await bcrypt.hash("Nikesh@123",1);
            console.log(hash);
            let same=await bcrypt.compare("Nikesh123",hash);
            console.log(same);
        }
)();
