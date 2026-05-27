import { Navigate } from 'react-router-dom';

/** Transaction password flow disabled — redirect to dashboard. */
const TransactionPasswordSuccess = () => <Navigate to='/home' replace />;

export default TransactionPasswordSuccess;
