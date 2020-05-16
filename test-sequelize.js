import path from 'path';
import {uuid} from 'uuidv4'

require('dotenv').config({path: path.join(__dirname, '../src/.env')})

let Sequelize = require('sequelize');
let sequelize = new Sequelize('test-encrypt', 'cody', 'test', {
    dialect: 'postgres',
    port: 5432,
    logging: true
});


let User = sequelize.define("users", {
        id: {type: Sequelize.UUID, unique: true, primaryKey: true},
        name: {type: Sequelize.STRING, primaryKey: true},
        data: {type: Sequelize.TEXT}
    },
    {
        freezeTableName: true, // Model tableName will be the same as the model name
        timestamps: false
    }
);

sequelize.sync().then(function () {
})

// Insert data into the User's table
const createUser = (name, data, userKey, serverKey) => {
    console.log("name is", name)
    let user = User.build({
        id: uuid(),
        name: name,
        data:
            Sequelize.fn(
                'PGP_SYM_ENCRYPT',
                Sequelize.cast(Sequelize.fn(
                    'PGP_SYM_ENCRYPT',
                    data,
                    userKey
                ), 'text'),
                serverKey
            ),
    });
    user.save().then(record => {
        console.log("user created", record)
    })
}

// Read out encrypted data:
const findUser = (name, userKey, serverKey) =>
    User.findOne({
        where: {name},
        attributes: [
            'name',
            [
                Sequelize.fn(
                    'PGP_SYM_DECRYPT',
                    Sequelize.cast(Sequelize.fn(
                        'PGP_SYM_DECRYPT',
                        Sequelize.cast(Sequelize.col('data'), 'bytea'),
                        serverKey
                    ), 'bytea'),
                    userKey
                ),
                'data',
            ],
        ],
    })


//Update User's Dataq
const updateUser = (name, data, userKey, serverKey) =>
    User.findOne({
        where: {name}
    }).then(user => {
        if (user)
            user.update({
                name: name,
                data:
                    Sequelize.fn(
                        'PGP_SYM_ENCRYPT',
                        Sequelize.cast(Sequelize.fn(
                            'PGP_SYM_ENCRYPT',
                            data,
                            userKey
                        ), 'text'),
                        serverKey
                    ),
            })
    });


// Migrate User's Keys
const migrateUserKey = (name, oldKey, newKey, serverKey) =>
    User.update({
        data: Sequelize.fn(
            'PGP_SYM_ENCRYPT',
            Sequelize.cast(Sequelize.fn(
                'PGP_SYM_ENCRYPT',
                Sequelize.fn(
                    'PGP_SYM_DECRYPT',
                    Sequelize.cast(Sequelize.fn(
                        'PGP_SYM_DECRYPT',
                        Sequelize.cast(Sequelize.col('data'), 'bytea'),
                        serverKey
                    ), 'bytea'),
                    oldKey
                ),
                newKey
            ), 'text'),
            serverKey
        ),
    }, {where: {name}})

console.log("test finding user")

async function lookupData() {

    let foundUser = await findUser("marco2", "userKey", "serverKey");
    if (foundUser !== undefined && foundUser != null) console.log("foundUser", foundUser.dataValues)
    if (!foundUser) {
        console.log("try adding new data")
        createUser("marco2", "new data2", "userKey", "serverKey")

    } else {
        console.log("try updating data")
        let userUpdate = await   updateUser("marco2", "cool updated data", "userKey", "serverKey")
        console.log("try migrating data")
        let userMigrate = await migrateUserKey("marco2", "userKey", "coolKey", "serverKey")
    }

}

lookupData()
