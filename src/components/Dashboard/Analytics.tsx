import React from 'react';
import { BarChart3, TrendingUp, Activity, Calendar } from 'lucide-react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useLanguage } from '../../contexts/LanguageContext';

const Analytics: React.FC = () => {
  const { analytics, loading } = useAnalytics();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Analíticas de Uso
        </h3>
      </div>

      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-blue-900">{analytics.totalSyncs}</div>
                <div className="text-sm text-blue-600">Sincronizaciones</div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-green-900">{analytics.totalValidations}</div>
                <div className="text-sm text-green-600">Validaciones</div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-purple-900">{analytics.totalGenerations}</div>
                <div className="text-sm text-purple-600">Generaciones DJC</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Actividad Reciente</h4>
          {analytics.recentActivity.length > 0 ? (
            <div className="space-y-2">
              {analytics.recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.action_type === 'sync' ? 'bg-blue-500' :
                      activity.action_type === 'validation' ? 'bg-green-500' :
                      'bg-purple-500'
                    }`}></div>
                    <span className="text-sm text-gray-900 capitalize">
                      {activity.action_type} en {activity.section}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No hay actividad reciente</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;