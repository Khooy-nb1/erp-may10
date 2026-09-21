const { validId, validateDocument, createDocument, updateDocument, deleteDocument } = require('../services/documentWriteService');

async function postDocument(req, res) {
  const data = validateDocument(req.body);
  res.status(201).json({ data: await createDocument(data) });
}
async function patchDocument(req, res) {
  const id = validId(req.params.id);
  const data = validateDocument(req.body, true);
  res.json({ data: await updateDocument(id, data) });
}
async function removeDocument(req, res) {
  await deleteDocument(validId(req.params.id));
  res.status(204).end();
}

module.exports = { postDocument, patchDocument, removeDocument };
