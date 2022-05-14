const mongoose = require('mongoose')

const itemSchema = new mongoose.Schema({
    item_title: {
        type: String,
    },
   sort_order:{
       type:String
   },
    item_uuid: {
        type: String,
    },
    company_uuid: {
        type: String,
    },
    category_uuid: {
        type: String,
    },
    pronounce: {
        type: String,
    },
    mrp: {
        type: String,
    },
    item_price: {
        type: String,
    },
    item_gst: {
        type: String,
    },
    conversation: {
        type: String,
    },
    barcode: [{
        type: String,
    }],
})


module.exports = mongoose.model('items', itemSchema)