/**
 * EUAdmin Frontend - Deployment Wizard Page
 * Multi-step wizard for deploying tenant ecosystems
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Rocket, ChevronRight, ChevronLeft, Check, Server, 
  Palette, Download, Play, AlertTriangle,
  Copy, CheckCircle, XCircle, Loader2
} from 'lucide-react';
import { 
  companiesApi, deploymentsApi, brandingApi,
  type Company, type DeploymentPreview, type Deployment
} from '../api/tenant';

type Step = 'config' | 'services' | 'branding' | 'review' | 'deploy';

export default function DeploymentWizardPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('config');
  const [company, setCompany] = useState<Company | null>(null);
  const [preview, setPreview] = useState<DeploymentPreview | null>(null);
  const [yamlPreview, setYamlPreview] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [error, setError] = useState('');
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([]);
  
  // Config options
  const [selectedServices, setSelectedServices] = useState<string[]>([
    'dashboard', 'login', 'eucloud', 'eutype', 'eumail', 'eugroups'
  ]);
  const [forceRedeploy, setForceRedeploy] = useState(false);
  
  const steps: { id: Step; label: string }[] = [
    { id: 'config', label: 'Configuration' },
    { id: 'services', label: 'Services' },
    { id: 'branding', label: 'Branding' },
    { id: 'review', label: 'Review' },
    { id: 'deploy', label: 'Deploy' },
  ];
  
  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);
  
  async function loadData() {
    setLoading(true);
    try {
      const [companyData, previewData] = await Promise.all([
        companiesApi.get(Number(companyId)),
        deploymentsApi.preview(Number(companyId)),
      ]);
      setCompany(companyData);
      setPreview(previewData);
      
      // Set selected services from preview
      if (previewData.services) {
        setSelectedServices(previewData.services.map(s => s.type));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }
  
  async function loadYamlPreview() {
    try {
      const result = await deploymentsApi.previewYaml(Number(companyId));
      setYamlPreview(result.yaml);
    } catch (err) {
      console.error('Failed to load YAML preview:', err);
    }
  }
  
  async function handleDeploy() {
    setDeploying(true);
    setError('');
    setDeploymentLogs(['Starting deployment...']);
    
    try {
      const result = await deploymentsApi.deploy(Number(companyId), {
        deployment_type: 'full',
        services: selectedServices,
        force: forceRedeploy,
      });
      
      setDeployment(result);
      setDeploymentLogs(logs => [...logs, `Deployment ${result.deployment_id} created`]);
      
      // Poll for status
      const pollStatus = async () => {
        const updated = await deploymentsApi.get(result.deployment_id);
        setDeployment(updated);
        
        if (updated.status === 'in_progress') {
          setDeploymentLogs(logs => [...logs, updated.status_message || 'In progress...']);
          setTimeout(pollStatus, 2000);
        } else if (updated.status === 'completed') {
          setDeploymentLogs(logs => [...logs, '✓ Deployment completed successfully!']);
        } else if (updated.status === 'failed') {
          setDeploymentLogs(logs => [...logs, `✗ Deployment failed: ${updated.status_message}`]);
          setError(updated.status_message || 'Deployment failed');
        }
      };
      
      setTimeout(pollStatus, 2000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deployment failed');
      setDeploymentLogs(logs => [...logs, `Error: ${err}`]);
    } finally {
      setDeploying(false);
    }
  }
  
  async function handleDownloadYaml() {
    try {
      const result = await deploymentsApi.previewYaml(Number(companyId));
      const blob = new Blob([result.yaml], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${company?.slug || 'tenant'}-deployment.yaml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download YAML');
    }
  }
  
  function copyYaml() {
    navigator.clipboard.writeText(yamlPreview);
  }
  
  function nextStep() {
    const stepIndex = steps.findIndex(s => s.id === currentStep);
    if (stepIndex < steps.length - 1) {
      const next = steps[stepIndex + 1].id;
      setCurrentStep(next);
      if (next === 'review') {
        loadYamlPreview();
      }
    }
  }
  
  function prevStep() {
    const stepIndex = steps.findIndex(s => s.id === currentStep);
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1].id);
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }
  
  if (error && !deployment) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary-100 rounded-xl">
          <Rocket className="w-8 h-8 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deploy {company?.name}</h1>
          <p className="text-gray-500">Namespace: {company?.namespace}</p>
        </div>
      </div>
      
      {/* Progress Steps */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const stepIndex = steps.findIndex(s => s.id === currentStep);
            const isCompleted = index < stepIndex;
            const isCurrent = step.id === currentStep;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center gap-2 ${
                  isCurrent ? 'text-primary-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isCurrent ? 'bg-primary-100' : isCompleted ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
                  </div>
                  <span className="font-medium hidden sm:inline">{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-gray-300 mx-2" />
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Step Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {currentStep === 'config' && (
          <ConfigStep
            company={company!}
            preview={preview}
            forceRedeploy={forceRedeploy}
            setForceRedeploy={setForceRedeploy}
          />
        )}
        
        {currentStep === 'services' && (
          <ServicesStep
            preview={preview}
            selectedServices={selectedServices}
            setSelectedServices={setSelectedServices}
          />
        )}
        
        {currentStep === 'branding' && (
          <BrandingStep companyId={Number(companyId)} />
        )}
        
        {currentStep === 'review' && (
          <ReviewStep
            company={company!}
            preview={preview}
            selectedServices={selectedServices}
            yamlPreview={yamlPreview}
            onCopyYaml={copyYaml}
            onDownloadYaml={handleDownloadYaml}
          />
        )}
        
        {currentStep === 'deploy' && (
          <DeployStep
            deployment={deployment}
            deploymentLogs={deploymentLogs}
            deploying={deploying}
            error={error}
            onDeploy={handleDeploy}
            company={company!}
          />
        )}
      </div>
      
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevStep}
          disabled={currentStep === 'config'}
          className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>
        
        {currentStep !== 'deploy' ? (
          <button
            onClick={nextStep}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => navigate('/companies')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg"
          >
            Back to Companies
          </button>
        )}
      </div>
    </div>
  );
}

// Step Components
function ConfigStep({ 
  company, 
  preview,
  forceRedeploy,
  setForceRedeploy 
}: { 
  company: Company; 
  preview: DeploymentPreview | null;
  forceRedeploy: boolean;
  setForceRedeploy: (v: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Server className="w-5 h-5" />
        Deployment Configuration
      </h2>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <label className="text-xs text-gray-500 uppercase">Namespace</label>
          <p className="font-mono text-lg">{company.namespace}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <label className="text-xs text-gray-500 uppercase">Target</label>
          <p className="text-lg capitalize">{company.deployment_target?.replace('_', ' ')}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <label className="text-xs text-gray-500 uppercase">Estimated CPU</label>
          <p className="text-lg">{preview?.estimated_resources?.cpu || 'N/A'}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <label className="text-xs text-gray-500 uppercase">Estimated Memory</label>
          <p className="text-lg">{preview?.estimated_resources?.memory || 'N/A'}</p>
        </div>
      </div>
      
      <div className="border-t pt-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={forceRedeploy}
            onChange={(e) => setForceRedeploy(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-gray-700">Force redeploy (recreate all resources)</span>
        </label>
      </div>
    </div>
  );
}

function ServicesStep({
  preview,
  selectedServices,
  setSelectedServices,
}: {
  preview: DeploymentPreview | null;
  selectedServices: string[];
  setSelectedServices: (services: string[]) => void;
}) {
  const allServices = preview?.services || [];
  
  function toggleService(type: string) {
    if (selectedServices.includes(type)) {
      setSelectedServices(selectedServices.filter(s => s !== type));
    } else {
      setSelectedServices([...selectedServices, type]);
    }
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Select Services to Deploy</h2>
      
      <div className="grid gap-4">
        {allServices.map((service) => (
          <label
            key={service.type}
            className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
              selectedServices.includes(service.type)
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedServices.includes(service.type)}
                onChange={() => toggleService(service.type)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600"
              />
              <div>
                <p className="font-medium capitalize">{service.type}</p>
                <p className="text-sm text-gray-500">{service.name}</p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="text-gray-600">Port: {service.port || 'Auto'}</p>
              <p className="text-gray-400">Replicas: {service.replicas}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

function BrandingStep({ companyId }: { companyId: number }) {
  const [branding, setBranding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    brandingApi.get(companyId)
      .then(setBranding)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [companyId]);
  
  if (loading) {
    return <div className="animate-pulse h-40 bg-gray-100 rounded-lg" />;
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Palette className="w-5 h-5" />
        Branding Preview
      </h2>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <label className="text-xs text-gray-500 uppercase">Company Name</label>
          <p className="text-lg">{branding?.company_display_name || 'Not set'}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <label className="text-xs text-gray-500 uppercase">Tagline</label>
          <p className="text-lg">{branding?.tagline || 'Not set'}</p>
        </div>
      </div>
      
      <div>
        <label className="text-xs text-gray-500 uppercase mb-2 block">Colors</label>
        <div className="flex gap-4">
          {[
            { label: 'Primary', color: branding?.primary_color || '#1E40AF' },
            { label: 'Secondary', color: branding?.secondary_color || '#3B82F6' },
            { label: 'Accent', color: branding?.accent_color || '#60A5FA' },
          ].map(({ label, color }) => (
            <div key={label} className="text-center">
              <div
                className="w-12 h-12 rounded-lg shadow-sm border"
                style={{ backgroundColor: color }}
              />
              <p className="text-xs text-gray-500 mt-1">{label}</p>
              <p className="text-xs font-mono">{color}</p>
            </div>
          ))}
        </div>
      </div>
      
      <p className="text-sm text-gray-500">
        You can edit branding in the company settings after deployment.
      </p>
    </div>
  );
}

function ReviewStep({
  company,
  preview,
  selectedServices,
  yamlPreview,
  onCopyYaml,
  onDownloadYaml,
}: {
  company: Company;
  preview: DeploymentPreview | null;
  selectedServices: string[];
  yamlPreview: string;
  onCopyYaml: () => void;
  onDownloadYaml: () => void;
}) {
  const [showYaml, setShowYaml] = useState(false);
  
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Review Deployment</h2>
      
      <div className="grid gap-4">
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">Company</h3>
          <p className="text-gray-600">{company.name}</p>
          <p className="text-sm text-gray-500 font-mono">{company.namespace}</p>
        </div>
        
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">Services ({selectedServices.length})</h3>
          <div className="flex flex-wrap gap-2">
            {selectedServices.map(s => (
              <span key={s} className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-sm capitalize">
                {s}
              </span>
            ))}
          </div>
        </div>
        
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">Resources</h3>
          <p className="text-gray-600">
            CPU: {preview?.estimated_resources?.cpu} | Memory: {preview?.estimated_resources?.memory}
          </p>
        </div>
      </div>
      
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Generated YAML</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowYaml(!showYaml)}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              {showYaml ? 'Hide' : 'Show'} YAML
            </button>
            <button
              onClick={onCopyYaml}
              className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-700"
            >
              <Copy className="w-4 h-4" /> Copy
            </button>
            <button
              onClick={onDownloadYaml}
              className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-700"
            >
              <Download className="w-4 h-4" /> Download
            </button>
          </div>
        </div>
        
        {showYaml && (
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs max-h-96">
            {yamlPreview || 'Loading...'}
          </pre>
        )}
      </div>
    </div>
  );
}

function DeployStep({
  deployment,
  deploymentLogs,
  deploying,
  error,
  onDeploy,
  company,
}: {
  deployment: Deployment | null;
  deploymentLogs: string[];
  deploying: boolean;
  error: string;
  onDeploy: () => void;
  company: Company;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Rocket className="w-5 h-5" />
        Deploy to Kubernetes
      </h2>
      
      {!deployment && !deploying && (
        <div className="text-center py-8">
          <Rocket className="w-16 h-16 text-primary-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Ready to Deploy
          </h3>
          <p className="text-gray-500 mb-6">
            {company.deployment_target === 'self_hosted' 
              ? 'Download the YAML and apply it to your cluster.'
              : 'Click deploy to create the tenant ecosystem on Kubernetes.'}
          </p>
          <button
            onClick={onDeploy}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white hover:bg-primary-700 rounded-lg font-medium"
          >
            <Play className="w-5 h-5" />
            {company.deployment_target === 'self_hosted' ? 'Generate YAML' : 'Deploy Now'}
          </button>
        </div>
      )}
      
      {(deploying || deployment) && (
        <div className="space-y-4">
          {/* Status */}
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            deployment?.status === 'completed' ? 'bg-green-50 text-green-700' :
            deployment?.status === 'failed' ? 'bg-red-50 text-red-700' :
            'bg-blue-50 text-blue-700'
          }`}>
            {deploying || deployment?.status === 'in_progress' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : deployment?.status === 'completed' ? (
              <CheckCircle className="w-5 h-5" />
            ) : deployment?.status === 'failed' ? (
              <XCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <span className="font-medium">
              {deploying ? 'Deploying...' :
               deployment?.status === 'completed' ? 'Deployment Completed' :
               deployment?.status === 'failed' ? 'Deployment Failed' :
               deployment?.status_message || 'Processing...'}
            </span>
          </div>
          
          {/* Logs */}
          <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
            <div className="font-mono text-sm space-y-1">
              {deploymentLogs.map((log, i) => (
                <div key={i} className={`${
                  log.startsWith('✓') ? 'text-green-400' :
                  log.startsWith('✗') || log.startsWith('Error') ? 'text-red-400' :
                  'text-gray-300'
                }`}>
                  {log}
                </div>
              ))}
              {deploying && (
                <div className="text-gray-500 animate-pulse">▋</div>
              )}
            </div>
          </div>
          
          {/* Duration */}
          {deployment?.duration_seconds && (
            <p className="text-sm text-gray-500">
              Duration: {deployment.duration_seconds} seconds
            </p>
          )}
        </div>
      )}
      
      {error && !deployment?.status && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}
    </div>
  );
}
