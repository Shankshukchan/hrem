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
  toggleTopCity,
  getTopCities,
  getTopCitiesByState,
} from "../controllers/statesCitiesController.js";
import { isAdmin, isAuthenticated } from "../middleware/isAuthenticated.js";

const router = express.Router();

// Public routes - fetch states and cities
router.get("/states", getAllStates);
router.get("/states/:stateName/cities", getCitiesByState);
router.get("/seo", getCitySEO);
router.get("/top-cities", getTopCities);
router.get("/top-cities-by-state", getTopCitiesByState);

// Admin routes - manage states and cities
router.post("/admin/add-state", isAuthenticated, isAdmin, addState);
router.post("/admin/add-city", isAuthenticated, isAdmin, addCityToState);
router.post("/admin/update-seo", isAuthenticated, isAdmin, updateCitySEO);
router.post("/admin/toggle-top-city", isAuthenticated, isAdmin, toggleTopCity);
router.delete(
  "/admin/delete-state/:stateId",
  isAuthenticated,
  isAdmin,
  deleteState,
);
router.post("/admin/delete-city", isAuthenticated, isAdmin, deleteCity);

export default router;
