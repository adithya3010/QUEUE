import Link from "next/link";
import { Clock, Calendar, ChevronRight, AlertCircle, Building2 } from "lucide-react";
import { getOrgInfo, getServices } from "@/lib/api";

// Revalidate this page every hour (or keep it dynamic based on your needs)
export const revalidate = 3600;

export default async function Home() {
  let orgInfo = null;
  let services = [];
  let error = null;

  try {
    const [orgRes, servicesRes] = await Promise.all([
      getOrgInfo(),
      getServices()
    ]);
    orgInfo = orgRes.data;
    services = servicesRes.data;

    console.log("Found services: ", services.length);

  } catch (err: any) {
    console.error("Failed to load data:", err);
    error = err.message || "Failed to connect to scheduling server. Please ensure the backend is running and x-api-key is configured.";
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center">
      {/* Hero Header */}
      <div className="w-full bg-blue-600 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-blue-100" />
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            {orgInfo?.name || "Our Clinic"} Scheduling
          </h1>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto">
            Book your appointment online and skip the waiting room.
            Real-time availability powered by Smart-Queue.
          </p>
        </div>
      </div>

      <div className="max-w-4xl w-full px-6 py-12 -mt-8 relative z-10">

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-md shadow-sm">
            <div className="flex items-center text-red-700">
              <AlertCircle className="w-5 h-5 mr-3" />
              <p>{error}</p>
            </div>
            <p className="text-sm text-red-600 mt-2 ml-8">
              Make sure you have added your valid SMART_QUEUE_API_KEY to .env.local in the demo app folder.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Select a Service</h2>
          <div className="text-sm font-medium px-3 py-1 bg-green-100 text-green-700 rounded-full flex items-center">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            Live Availability
          </div>
        </div>

        {/* Services List */}
        <div className="grid gap-6 md:grid-cols-2">
          {services.map((service: any) => (
            <Link
              key={service.id}
              href={`/book/${service.id}`}
              className="glass-panel group p-6 rounded-2xl hover:shadow-lg hover:border-blue-200 transition-all duration-300 relative overflow-hidden bg-white/80"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform"></div>

              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded-md mb-2 inline-block">
                    {service.category || "General"}
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {service.name}
                  </h3>
                </div>
                <div className="bg-gray-50 p-2 rounded-full group-hover:bg-blue-50 transition-colors">
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <div className="flex items-center text-sm text-gray-600 bg-gray-50/50 p-2 rounded-lg">
                  <Clock className="w-4 h-4 mr-3 text-blue-500" />
                  <span>Avg. Session: {service.avgSessionDuration} mins</span>
                </div>

                {service.totalAgents > 0 && (
                  <div className="flex items-center text-sm text-gray-600 bg-gray-50/50 p-2 rounded-lg">
                    <Calendar className="w-4 h-4 mr-3 text-purple-500" />
                    <span>{service.totalAgents} provider(s) available</span>
                  </div>
                )}
              </div>
            </Link>
          ))}

          {services.length === 0 && !error && (
            <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-500">
              <p className="text-lg">No services are currently configured for this organization.</p>
              <p className="text-sm mt-2">Add services in the Smart-Queue Admin Panel.</p>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
