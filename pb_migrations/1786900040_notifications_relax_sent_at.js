/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2301922722")

  // [fix/production-readiness]
  // notifications.status شامل مقدار "pending" است، یعنی یک نوتیفیکیشن باید
  // بتواند قبل از ارسال واقعی (پیش از این‌که sent_at معنایی داشته باشد) ساخته
  // شود. required=true روی sent_at این حالت را غیرممکن می‌کرد.
  collection.fields.addAt(7, new Field({
    "help": "",
    "hidden": false,
    "id": "date2531586952",
    "max": "",
    "min": "",
    "name": "sent_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2301922722")

  collection.fields.addAt(7, new Field({
    "help": "",
    "hidden": false,
    "id": "date2531586952",
    "max": "",
    "min": "",
    "name": "sent_at",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
})
