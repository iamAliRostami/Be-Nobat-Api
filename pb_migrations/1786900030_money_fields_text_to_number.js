/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const appointment = app.findCollectionByNameOrId("pbc_1970990732")

  appointment.fields.addAt(6, new Field({
    "help": "",
    "hidden": false,
    "id": "number163230955",
    "max": null,
    "min": 0,
    "name": "total_price",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  appointment.fields.addAt(7, new Field({
    "help": "",
    "hidden": false,
    "id": "number3772865661",
    "max": null,
    "min": 0,
    "name": "discount_amount",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  appointment.fields.addAt(8, new Field({
    "help": "",
    "hidden": false,
    "id": "number3419435337",
    "max": null,
    "min": 0,
    "name": "final_price",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  app.save(appointment)

  const appointmentServices = app.findCollectionByNameOrId("pbc_1262204345")

  appointmentServices.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "number3402113753",
    "max": null,
    "min": 0,
    "name": "price",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  return app.save(appointmentServices)
}, (app) => {
  const appointment = app.findCollectionByNameOrId("pbc_1970990732")

  appointment.fields.addAt(6, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text163230955",
    "max": 0,
    "min": 0,
    "name": "total_price",
    "pattern": "^(0|[1-9]\\d*)$",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  appointment.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3772865661",
    "max": 0,
    "min": 0,
    "name": "discount_amount",
    "pattern": "^(0|[1-9]\\d*)$",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  appointment.fields.addAt(8, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3419435337",
    "max": 0,
    "min": 0,
    "name": "final_price",
    "pattern": "^(0|[1-9]\\d*)$",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  app.save(appointment)

  const appointmentServices = app.findCollectionByNameOrId("pbc_1262204345")

  appointmentServices.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3402113753",
    "max": 0,
    "min": 1,
    "name": "price",
    "pattern": "^(0|[1-9]\\d*)$",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  return app.save(appointmentServices)
})
