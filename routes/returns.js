const Joi = require('joi');
const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { Rental } = require('../models/rental');
const { Movie } = require('../models/movie');
const router = express.Router();

router.post('/', [auth, validate(validateReturn)], async (req, res) => {
    const rental = await Rental.lookup(req.body.customerId, req.body.movieId);
    
    if(!rental) return res.status(404).send('Rental not found!');

    if(rental.dateReturned) return res.status(400).send('Rental already processed.');

    await Movie.update({ _id: rental.movie._id }, {
        $inc: { numberInStock: 1 }       
    });

    rental.return();

    await rental.save();

    return res.send(rental);
});

function validateReturn(req) {
    const schema = {
      customerId: Joi.objectId().required(),
      movieId: Joi.objectId().required()
    };
  
    return Joi.validate(req, schema);
}

module.exports = router;