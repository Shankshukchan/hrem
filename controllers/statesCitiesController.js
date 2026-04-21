import { State } from "../models/statesCitiesModel.js";

export const addState = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "State name is required",
      });
    }

    // Check if state already exists
    const existingState = await State.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingState) {
      return res.status(400).json({
        success: false,
        message: "State already exists",
      });
    }

    const newState = await State.create({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      cities: [],
    });

    return res.status(201).json({
      success: true,
      message: "State added successfully",
      state: newState,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const addCityToState = async (req, res) => {
  try {
    const { stateName, cityName } = req.body;

    if (!stateName || !cityName) {
      return res.status(400).json({
        success: false,
        message: "State name and city name are required",
      });
    }

    // Find state (case-insensitive)
    const state = await State.findOne({
      name: { $regex: new RegExp(`^${stateName}$`, "i") },
    });

    if (!state) {
      return res.status(404).json({
        success: false,
        message: "State not found",
      });
    }

    // Check if city already exists in this state
    const cityExists = state.cities.some(
      (city) => city.name.toLowerCase() === cityName.toLowerCase(),
    );

    if (cityExists) {
      return res.status(400).json({
        success: false,
        message: "City already exists in this state",
      });
    }

    // Add city to state
    state.cities.push({
      name: cityName.charAt(0).toUpperCase() + cityName.slice(1),
    });

    await state.save();

    return res.status(200).json({
      success: true,
      message: "City added successfully",
      state,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllStates = async (req, res) => {
  try {
    const states = await State.find().sort({ name: 1 });

    return res.status(200).json({
      success: true,
      states,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCitiesByState = async (req, res) => {
  try {
    const { stateName } = req.params;

    const state = await State.findOne({
      name: { $regex: new RegExp(`^${stateName}$`, "i") },
    });

    if (!state) {
      return res.status(404).json({
        success: false,
        message: "State not found",
      });
    }

    return res.status(200).json({
      success: true,
      cities: state.cities,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const deleteState = async (req, res) => {
  try {
    const { stateId } = req.params;

    const state = await State.findByIdAndDelete(stateId);

    if (!state) {
      return res.status(404).json({
        success: false,
        message: "State not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "State deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteCity = async (req, res) => {
  try {
    const { stateId, cityName } = req.body;

    const state = await State.findById(stateId);

    if (!state) {
      return res.status(404).json({
        success: false,
        message: "State not found",
      });
    }

    // Find and remove city
    const cityIndex = state.cities.findIndex(
      (city) => city.name.toLowerCase() === cityName.toLowerCase(),
    );

    if (cityIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "City not found",
      });
    }

    state.cities.splice(cityIndex, 1);
    await state.save();

    return res.status(200).json({
      success: true,
      message: "City deleted successfully",
      state,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
