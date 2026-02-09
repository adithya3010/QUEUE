const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({
    name : {type : String,required :true},
    specialization : {type : String , required :true},
    availability : {
        type: String ,
        enum :["Available","Not Available","Break"],
        default: "Available"
    },
    avgConsultationTime : {type: Number,default : 8},
    email : {type : String,required :true, unique: true},
    password : {type:String , required:true},
    refreshToken : {type: String},
    refreshTokenExpiry : {type: Date},
    resetPasswordToken : {type: String},
    resetPasswordExpiry : {type: Date}
});

module.exports = mongoose.model("Doctor",doctorSchema);
