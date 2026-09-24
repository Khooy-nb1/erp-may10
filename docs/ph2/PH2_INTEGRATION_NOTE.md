# PH2 Production integration

This branch was assembled from the existing `feature/SanXuatNguyenLieu` tree plus the audited API-backed PH2 production implementation.

Integrated:
- `backend/src/controllers/productionController.js`
- `backend/src/routes/productionRoutes.js`
- `backend/src/validators/productionValidator.js`
- `frontend/src/pages/ProductionModule.jsx`
- `frontend/src/pages/production/*`
- `frontend/src/services/productionService.js`
- PH2 route registration in `backend/src/app.js`
- `production/*` splat route in `frontend/src/routes/AppRoutes.jsx`

Preserved the existing branch's other PH1/PH4 files instead of replacing them wholesale.
