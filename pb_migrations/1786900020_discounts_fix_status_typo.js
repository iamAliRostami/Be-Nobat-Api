/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2558321696")

  // [fix/production-readiness] تایپوی "inavtive" در مقادیر select اصلاح شد.
  // اگر رکوردی با مقدار قدیمی "inavtive" ذخیره شده باشد، تا وقتی دستی
  // به‌روزرسانی نشود PocketBase در فیلترها/اعتبارسنجی آن را به عنوان یک
  // گزینه‌ی نامعتبر می‌بیند؛ برای پروژه‌های تازه (بدون داده‌ی واقعی) این
  // یک تغییر بی‌خطر است.
  collection.fields.addAt(15, new Field({
    "help": "",
    "hidden": false,
    "id": "select2063623452",
    "maxSelect": 0,
    "name": "status",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "active",
      "inactive"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2558321696")

  collection.fields.addAt(15, new Field({
    "help": "",
    "hidden": false,
    "id": "select2063623452",
    "maxSelect": 0,
    "name": "status",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "active",
      "inavtive"
    ]
  }))

  return app.save(collection)
})
