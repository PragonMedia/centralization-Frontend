import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const EditPage = () => {
  const { domain, route } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    domain: domain,
    route: route,
    rtkID: "",
    ringbaID: "",
    phoneNumber: "",
  });

  const [loading, setLoading] = useState(true);
  console.log("http://localhost:3000/api/v1/data");
  console.log(domain, route);
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/v1/data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            domain: domain,
            route: route,
          }),
        });

        const res = await response.json();

        setFormData({
          domain: domain,
          route: route,
          rtkID: res.rtkID || "",
          ringbaID: res.ringbaID || "",
          phoneNumber: res.phoneNumber || "",
        });

        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [domain, route]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:3000/api/v1/updateData", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domain: domain,
          route: route,
          rtkID: formData.rtkID,
          ringbaID: formData.ringbaID,
          phoneNumber: formData.phoneNumber,
        }),
      });

      const result = await response.json();
      console.log("Updated:", result);
      alert("Data updated successfully!");

      navigate("/domain");
    } catch (err) {
      console.error("Update failed:", err);
      alert("Update failed.");
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">Edit Route</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-semibold">RTK ID</label>
          <input
            type="text"
            name="rtkID"
            value={formData.rtkID}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold">Ringba ID</label>
          <input
            type="text"
            name="ringbaID"
            value={formData.ringbaID}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold">Phone Number</label>
          <input
            type="text"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default EditPage;
