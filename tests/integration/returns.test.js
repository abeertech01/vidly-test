const moment = require('moment');
const request = require('supertest');
const { Rental } = require('../../models/rental');
const mongoose = require('mongoose');
const { User } = require('../../models/user');

describe('/api/returns', ()=>{
    let server;
    let customerId;
    let movieId;
    let rental;
    let token;

    const exec = ()=>{
        return request(server)
            .post('/api/returns')
            .set('x-auth-token', token)
            .send({ customerId, movieId });
    };

    beforeEach(async ()=>{ 
        server = require('../../index'); 

        customerId = mongoose.Types.ObjectId();
        movieId = mongoose.Types.ObjectId();
        token = new User().generateAuthToken();

        rental = new Rental({
            customer: {
                _id: customerId,
                name: '12345',
                phone: '12345'
            },
            movie: {
                _id: movieId,
                title: '12345',
                dailyRentalRate: 2
            }
        });

        await rental.save();
    });

    afterEach(async ()=>{ 
        await server.close(); 
        await Rental.remove({});
    });

    it('should return 401 if client is not logged in', async ()=>{
        token = '';

        const res = await exec();

        expect(res.status).toBe(401);
    });

    it('should return 400 if customerId is not provided', async ()=>{
        customerId = '';

        const res = await exec();

        expect(res.status).toBe(400);
    });

    it('should return 400 if movieId is not provided', async ()=>{
        movieId = '';

        const res = await exec();

        expect(res.status).toBe(400);
    });

    it('should return 404 if rental is not found', async ()=>{
        await Rental.remove({});

        const res = await exec();

        expect(res.status).toBe(404);
    });

    it('should return 400 if return is already processed', async ()=>{
        rental.dateReturned = new Date();
        await rental.save();

        const res = await exec();

        expect(res.status).toBe(400);
    });

    it('should return 200 if we have a valid request', async ()=>{
        const res = await exec();

        expect(res.status).toBe(200);
    });

    it('should set the return Date if input is valid', async ()=>{
        const res = await exec();

        const rentalInDb = await Rental.findById(rental._id);
        const diff = new Date() - rentalInDb.dateReturned;
        expect(diff).toBeLessThan(12*1000);
    });

    it('should set the Rental Fee if input is valid', async ()=>{
        rental.dateOut = moment().add(-7, 'days').toDate();
        await rental.save();

        const res = await exec();

        const rentalInDb = await Rental.findById(rental._id);
        expect(rentalInDb.rentalFee).toBe(14);
    });
});