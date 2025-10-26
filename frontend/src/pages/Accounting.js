
import { DollarSign } from 'lucide-react';
import PageHeader from '../components/Common/PageHeader';
import Card from '../components/Common/Card';

const Accounting = () => {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Contabilidad"
                subtitle="Gestión financiera y contable"
                icon={DollarSign}
            />

            <Card>
                <div className="text-center py-12">
                    <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Contabilidad</h3>
                    <p className="text-gray-600">Administra las finanzas y contabilidad de la parroquia.</p>
                </div>
            </Card>
        </div>
    );
};

export default Accounting;