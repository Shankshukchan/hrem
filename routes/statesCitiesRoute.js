import express from "express";
import {
  addState,
  addCityToState,
  getAllStates,
  getCitiesByState,
  deleteState,
  deleteCity,
  updateCitySEO,
  getCitySEO,
} from "../controllers/statesCitiesController.js";
import { isAdmin, isAuthenticated } from "../middleware/isAuthenticated.js";

const router = express.Router();

// Public routes - fetch states and cities
router.get("/states", getAllStates);
router.get("/states/:stateName/cities", getCitiesByState);
router.get("/seo", getCitySEO);

// Admin routes - manage states and cities
router.post("/admin/add-state", isAuthenticated, isAdmin, addState);
router.post("/admin/add-city", isAuthenticated, isAdmin, addCityToState);
router.post("/admin/update-seo", isAuthenticated, isAdmin, updateCitySEO);
router.delete(
  "/admin/delete-state/:stateId",
  isAuthenticated,
  isAdmin,
  deleteState,
);
router.post("/admin/delete-city", isAuthenticated, isAdmin, deleteCity);

export default router;
